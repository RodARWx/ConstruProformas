import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository, DataSource } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { Profile } from '../profiles/entities/profile.entity';
import { CreateProformaDto } from './dto/create-proforma.dto';
import { NextIdResponse } from './dto/next-id-response.dto';
import { SyncProformasResult } from './dto/sync-result.dto';
import { UpdateProformaDto } from './dto/update-proforma.dto';
import { ProformaDetail } from './entities/proforma-detail.entity';
import { Proforma } from './entities/proforma.entity';
import { ProformaCounter } from './entities/proforma-counter.entity';
import { ProformaStatus } from './enums/proforma-status.enum';
import { calculateProformaTotals } from './helpers/proforma-calculator.helper';
import { applyCustomerSnapshotToProforma } from './helpers/proforma-customer-snapshot.helper';
import { buildProformaId, findMaxSequenceForYear } from './helpers/proforma-id.helper';
import { serializeProformaNotes, parseProformaNotes } from './helpers/proforma-notes.helper';
import { CreateProformaDetailDto } from './dto/create-proforma-detail.dto';

@Injectable()
export class ProformasService {
  constructor(
    @InjectRepository(Proforma)
    private readonly proformaRepository: Repository<Proforma>,
    @InjectRepository(ProformaDetail)
    private readonly proformaDetailRepository: Repository<ProformaDetail>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(ProformaCounter)
    private readonly counterRepository: Repository<ProformaCounter>,
    private readonly dataSource: DataSource,
  ) {}

  /** Relaciones estándar para respuestas completas al frontend */
  private readonly defaultRelations = ['detalles', 'profile', 'customer'] as const;

  async findAll(): Promise<Proforma[]> {
    return this.proformaRepository.find({
      relations: [...this.defaultRelations],
      order: { fecha: 'DESC' },
    });
  }

  /** Proformas en papelera (eliminación lógica). */
  async findTrash(): Promise<Proforma[]> {
    return this.proformaRepository.find({
      withDeleted: true,
      where: { deletedAt: Not(IsNull()) },
      relations: [...this.defaultRelations],
      order: { deletedAt: 'DESC' },
    });
  }

  async findOne(idProforma: string): Promise<Proforma> {
    const proforma = await this.proformaRepository.findOne({
      where: { idProforma },
      relations: [...this.defaultRelations],
    });

    if (!proforma) {
      throw new NotFoundException(`Proforma "${idProforma}" no encontrada`);
    }

    return proforma;
  }

  /**
   * Genera un ID único para el año actual de forma atómica.
   *
   * Usa una transacción con lectura/escritura exclusiva en SQLite para garantizar
   * que dos peticiones simultáneas nunca reciban el mismo número.
   *
   * Al primer uso en un año, inicializa el contador con el valor de
   * PROFORMA_ID_OFFSET (por defecto 200 para 2026) o con el mayor
   * número existente en la base de datos si ya hay proformas del año.
   */
  async generateNextId(): Promise<string> {
    const year = new Date().getFullYear();
    const offset = parseInt(process.env.PROFORMA_ID_OFFSET ?? '200', 10);

    return this.dataSource.transaction(async (manager) => {
      // SQLite con WAL serializa las escrituras automáticamente dentro de transacciones.
      // No se necesita setLock (not supported en better-sqlite3).
      const counter = await manager
        .getRepository(ProformaCounter)
        .findOne({ where: { year } });

      let nextSequence: number;

      if (!counter) {
        // Primer uso del año: determinar el valor inicial
        const existingRows = await this.proformaRepository.find({
          select: ['idProforma'],
          withDeleted: true,
        });
        const existingIds = existingRows.map((r) => r.idProforma);
        const maxInDb = findMaxSequenceForYear(existingIds, year);

        // Usar el mayor entre el offset configurado y el máximo en BD
        nextSequence = Math.max(offset, maxInDb + 1);

        await manager.getRepository(ProformaCounter).save(
          manager.getRepository(ProformaCounter).create({ year, lastSequence: nextSequence }),
        );
      } else {
        // Incremento atómico dentro de la transacción
        nextSequence = counter.lastSequence + 1;
        await manager.getRepository(ProformaCounter).update({ year }, { lastSequence: nextSequence });
      }

      return buildProformaId(nextSequence, year);
    });
  }


  /**
   * Devuelve el siguiente ID sugerido SIN reservarlo.
   * Usado por el frontend para previsualizar el ID antes de crear la proforma.
   */
  async getNextSuggestedId(): Promise<NextIdResponse> {
    const year = new Date().getFullYear();
    const offset = parseInt(process.env.PROFORMA_ID_OFFSET ?? '200', 10);

    const counter = await this.counterRepository.findOne({ where: { year } });

    if (!counter) {
      // No hay contador aún: calcular desde los IDs existentes
      const rows = await this.proformaRepository.find({
        select: ['idProforma'],
        withDeleted: true,
      });
      const existingIds = rows.map((r) => r.idProforma);
      const maxInDb = findMaxSequenceForYear(existingIds, year);
      const next = Math.max(offset, maxInDb + 1);
      return { suggestedId: buildProformaId(next, year) };
    }

    return { suggestedId: buildProformaId(counter.lastSequence + 1, year) };
  }

  /**
   * Crea una proforma recalculando todos los totales en el servidor.
   * Permite ID manual, pero rechaza duplicados en registros exportados.
   */
  async create(dto: CreateProformaDto): Promise<Proforma> {
    const customer = await this.getCustomerOrFail(dto.customerId);
    await this.validateReferences(dto.profileId, dto.customerId);
    await this.assertIdAvailableForCreate(dto.idProforma);

    const calculated = calculateProformaTotals(dto.detalles);

    const proforma = this.proformaRepository.create({
      idProforma: dto.idProforma,
      nombreProyecto: dto.nombreProyecto,
      tiempoEjecucion: calculated.tiempoEjecucion,
      tipoDias: dto.tipoDias ?? 'Días Laborables',
      fecha: dto.fecha,
      notas: serializeProformaNotes(dto.notas),
      status: dto.status ?? ProformaStatus.DRAFT,
      profileId: dto.profileId,
      customerId: dto.customerId,
      subtotal: calculated.subtotal,
      iva: calculated.iva,
      totalGeneral: calculated.totalGeneral,
      montoContrato: calculated.montoContrato,
      detalles: this.mapDetailsToEntities(dto.idProforma, calculated.detalles),
    });

    applyCustomerSnapshotToProforma(proforma, customer);

    const saved = await this.proformaRepository.save(proforma);
    return this.findOne(saved.idProforma);
  }

  /**
   * Actualiza una proforma recalculando totales si se envían rubros.
   * Si la proforma estaba EXPORTED, vuelve automáticamente a DRAFT;
   * la siguiente exportación guardará una versión nueva (_V2, _V3...) en el NAS.
   */
  async update(idProforma: string, dto: UpdateProformaDto): Promise<Proforma> {
    const proforma = await this.findOne(idProforma);

    if (dto.profileId !== undefined || dto.customerId !== undefined) {
      await this.validateReferences(
        dto.profileId ?? proforma.profileId,
        dto.customerId ?? proforma.customerId,
      );
    }

    if (dto.nombreProyecto !== undefined) proforma.nombreProyecto = dto.nombreProyecto;
    if (dto.fecha !== undefined) proforma.fecha = dto.fecha;
    if (dto.tipoDias !== undefined) proforma.tipoDias = dto.tipoDias;
    if (dto.profileId !== undefined) proforma.profileId = dto.profileId;
    if (dto.customerId !== undefined) proforma.customerId = dto.customerId;
    if (dto.notas !== undefined) {
      proforma.notas = serializeProformaNotes(dto.notas);
    }

    // Si estaba exportada y se modifica, vuelve a DRAFT para que la próxima
    // exportación genere un archivo _V2 en el NAS preservando el original.
    if (proforma.status === ProformaStatus.EXPORTED) {
      proforma.status = ProformaStatus.DRAFT;
    }

    // Permitir cambio explícito de status (ej. sync offline)
    if (dto.status !== undefined) proforma.status = dto.status;

    if (dto.detalles !== undefined) {
      const calculated = calculateProformaTotals(dto.detalles);

      proforma.subtotal = calculated.subtotal;
      proforma.iva = calculated.iva;
      proforma.totalGeneral = calculated.totalGeneral;
      proforma.montoContrato = calculated.montoContrato;
      proforma.tiempoEjecucion = calculated.tiempoEjecucion;

      // Reemplazo completo de líneas con cascade
      await this.proformaDetailRepository.delete({ proformaId: idProforma });
      proforma.detalles = this.mapDetailsToEntities(idProforma, calculated.detalles);
    }

    const customer = await this.getCustomerOrFail(proforma.customerId);
    applyCustomerSnapshotToProforma(proforma, customer);

    await this.proformaRepository.save(proforma);
    return this.findOne(idProforma);
  }

  /**
   * Duplica la cabecera y todas sus líneas de detalle,
   * asignando un nuevo ID sugerido y estado DRAFT.
   */
  async clone(idProforma: string): Promise<Proforma> {
    const source = await this.findOne(idProforma);
    const newId = await this.generateNextId();

    const calculated = calculateProformaTotals(
      source.detalles.map((linea) => this.mapEntityDetailToDto(linea)),
    );

    const clone = this.proformaRepository.create({
      idProforma: newId,
      nombreProyecto: `${source.nombreProyecto} (Copia)`,
      tiempoEjecucion: calculated.tiempoEjecucion,
      tipoDias: source.tipoDias ?? 'Días Laborables',
      fecha: new Date().toISOString().slice(0, 10),
      notas: source.notas,
      status: ProformaStatus.DRAFT,
      profileId: source.profileId,
      customerId: source.customerId,
      clienteNombre: source.clienteNombre,
      clienteRucCedula: source.clienteRucCedula,
      clienteDireccion: source.clienteDireccion,
      clienteTelefono: source.clienteTelefono,
      clienteCorreo: source.clienteCorreo,
      subtotal: calculated.subtotal,
      iva: calculated.iva,
      totalGeneral: calculated.totalGeneral,
      montoContrato: calculated.montoContrato,
      detalles: this.mapDetailsToEntities(newId, calculated.detalles),
    });

    if (!clone.clienteNombre) {
      const customer = await this.getCustomerOrFail(clone.customerId);
      applyCustomerSnapshotToProforma(clone, customer);
    }

    const saved = await this.proformaRepository.save(clone);
    return this.findOne(saved.idProforma);
  }

  /**
   * Procesa un lote de proformas capturadas offline en la PWA.
   * Inserta nuevas, actualiza borradores existentes y reporta errores por ítem.
   */
  async syncBatch(proformas: CreateProformaDto[]): Promise<SyncProformasResult> {
    const results: SyncProformasResult['results'] = [];

    for (const dto of proformas) {
      try {
        const existing = await this.proformaRepository.findOne({
          where: { idProforma: dto.idProforma },
          withDeleted: true,
        });

        let proforma: Proforma;

        if (!existing) {
          proforma = await this.create(dto);
        } else if (existing.deletedAt) {
          throw new ConflictException(
            `El ID "${dto.idProforma}" está en la papelera; restáurelo antes de sincronizar`,
          );
        } else if (existing.status === ProformaStatus.EXPORTED) {
          throw new ConflictException(
            `El ID "${dto.idProforma}" ya existe en una proforma exportada`,
          );
        } else {
          proforma = await this.update(dto.idProforma, {
            nombreProyecto: dto.nombreProyecto,
            fecha: dto.fecha,
            status: dto.status,
            profileId: dto.profileId,
            customerId: dto.customerId,
            detalles: dto.detalles,
          });
        }

        results.push({
          idProforma: dto.idProforma,
          success: true,
          proforma,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Error desconocido al sincronizar';

        results.push({
          idProforma: dto.idProforma,
          success: false,
          error: message,
        });
      }
    }

    const succeeded = results.filter((item) => item.success).length;

    return {
      total: proformas.length,
      succeeded,
      failed: proformas.length - succeeded,
      results,
    };
  }

  /** Valida que el perfil y el cliente existan antes de persistir */
  private async validateReferences(
    profileId: number,
    customerId: number,
  ): Promise<void> {
    const [profile, customer] = await Promise.all([
      this.profileRepository.findOne({ where: { id: profileId } }),
      this.customerRepository.findOne({ where: { id: customerId } }),
    ]);

    if (!profile) {
      throw new NotFoundException(`Perfil con id ${profileId} no encontrado`);
    }

    if (!customer) {
      throw new NotFoundException(`Cliente con id ${customerId} no encontrado`);
    }
  }

  private async getCustomerOrFail(customerId: number): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Cliente con id ${customerId} no encontrado`);
    }

    return customer;
  }

  /**
   * Impide crear proformas cuyo ID ya esté en uso,
   * con énfasis en registros exportados según la regla de negocio.
   */
  private async assertIdAvailableForCreate(idProforma: string): Promise<void> {
    const existing = await this.proformaRepository.findOne({
      where: { idProforma },
      withDeleted: true,
    });

    if (!existing) {
      return;
    }

    if (existing.deletedAt) {
      throw new ConflictException(
        `El ID "${idProforma}" está en la papelera. Restáurelo o elimínelo permanentemente antes de reutilizarlo.`,
      );
    }

    if (existing.status === ProformaStatus.EXPORTED) {
      throw new ConflictException(
        `El ID "${idProforma}" ya existe en una proforma exportada`,
      );
    }

    throw new ConflictException(`El ID "${idProforma}" ya está en uso`);
  }

  /** Mapea una entidad de detalle al DTO usado por el calculador. */
  private mapEntityDetailToDto(linea: ProformaDetail): CreateProformaDetailDto {
    return {
      codigo: linea.codigo ?? undefined,
      descripcion: linea.descripcion,
      tiempo: linea.tiempo ?? undefined,
      unidad: linea.unidad,
      cantidad: linea.cantidad,
      costoUnitario: linea.costoUnitario,
      diasLaborables: linea.diasLaborables,
      ivaPercentage: linea.ivaPercentage,
      esCategoria: linea.esCategoria ?? undefined,
    };
  }

  /** Mapea DTOs calculados a entidades de detalle listas para persistir */
  private mapDetailsToEntities(
    proformaId: string,
    detalles: Array<CreateProformaDetailDto & { total: number }>,
  ): ProformaDetail[] {
    return detalles.map((linea) =>
      this.proformaDetailRepository.create({
        proformaId,
        codigo: linea.codigo ?? null,
        descripcion: linea.descripcion,
        tiempo: linea.tiempo ?? null,
        unidad: linea.unidad,
        cantidad: linea.cantidad,
        costoUnitario: linea.costoUnitario,
        total: linea.total,
        diasLaborables: linea.diasLaborables,
        ivaPercentage: linea.ivaPercentage,
        esCategoria: linea.esCategoria === true,
      }),
    );
  }

  /** Marca la proforma como exportada tras generar PDF/Excel */
  async markAsExported(idProforma: string): Promise<void> {
    const proforma = await this.findOne(idProforma);
    proforma.status = ProformaStatus.EXPORTED;
    await this.proformaRepository.save(proforma);
  }

  /** Envía la proforma a la papelera (soft delete). */
  async remove(idProforma: string): Promise<void> {
    await this.findOne(idProforma);
    await this.proformaRepository.softDelete(idProforma);
  }

  /** Restaura una proforma desde la papelera. */
  async restore(idProforma: string): Promise<Proforma> {
    const proforma = await this.proformaRepository.findOne({
      where: { idProforma },
      withDeleted: true,
    });

    if (!proforma?.deletedAt) {
      throw new NotFoundException(
        `Proforma "${idProforma}" no encontrada en la papelera`,
      );
    }

    await this.proformaRepository.restore(idProforma);
    return this.findOne(idProforma);
  }

  /**
   * Elimina permanentemente una proforma que ya está en la papelera.
   * Solo se permite de una en una; libera el ID para reutilización futura.
   */
  async permanentRemove(idProforma: string): Promise<void> {
    const proforma = await this.proformaRepository.findOne({
      where: { idProforma },
      withDeleted: true,
      relations: [...this.defaultRelations],
    });

    if (!proforma?.deletedAt) {
      throw new NotFoundException(
        `Proforma "${idProforma}" no está en la papelera o ya fue eliminada`,
      );
    }

    await this.proformaRepository.remove(proforma);
  }

  /**
   * Sugiere notas usadas anteriormente en otras proformas (autocompletado).
   * Devuelve hasta 10 coincidencias en orden alfabético.
   */
  async getNotasSuggestions(term?: string): Promise<string[]> {
    const rows = await this.proformaRepository.find({
      select: ['notas'],
      where: {},
    });

    const normalizedTerm = term?.trim().toLowerCase() ?? '';
    const unique = new Set<string>();

    for (const row of rows) {
      for (const line of parseProformaNotes(row.notas)) {
        if (!normalizedTerm || line.toLowerCase().includes(normalizedTerm)) {
          unique.add(line);
        }
      }
    }

    return [...unique].sort((a, b) => a.localeCompare(b, 'es')).slice(0, 10);
  }
}
