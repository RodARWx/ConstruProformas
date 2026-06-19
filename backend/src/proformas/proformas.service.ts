import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { Profile } from '../profiles/entities/profile.entity';
import { CreateProformaDto } from './dto/create-proforma.dto';
import { NextIdResponse } from './dto/next-id-response.dto';
import { SyncProformasResult } from './dto/sync-result.dto';
import { UpdateProformaDto } from './dto/update-proforma.dto';
import { ProformaDetail } from './entities/proforma-detail.entity';
import { Proforma } from './entities/proforma.entity';
import { ProformaStatus } from './enums/proforma-status.enum';
import { calculateProformaTotals } from './helpers/proforma-calculator.helper';
import { suggestNextProformaId } from './helpers/proforma-id.helper';
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
  ) {}

  /** Relaciones estándar para respuestas completas al frontend */
  private readonly defaultRelations = ['detalles', 'profile', 'customer'] as const;

  async findAll(): Promise<Proforma[]> {
    return this.proformaRepository.find({
      relations: [...this.defaultRelations],
      order: { fecha: 'DESC' },
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
   * Busca el último ID numérico guardado y sugiere el siguiente secuencial.
   * Ejemplo: si el último es "CM-PROF-85", retorna "CM-PROF-86".
   */
  async getNextSuggestedId(): Promise<NextIdResponse> {
    const rows = await this.proformaRepository.find({
      select: ['idProforma'],
    });
    const existingIds = rows.map((row) => row.idProforma);

    return { suggestedId: suggestNextProformaId(existingIds) };
  }

  /**
   * Crea una proforma recalculando todos los totales en el servidor.
   * Permite ID manual, pero rechaza duplicados en registros exportados.
   */
  async create(dto: CreateProformaDto): Promise<Proforma> {
    await this.validateReferences(dto.profileId, dto.customerId);
    await this.assertIdAvailableForCreate(dto.idProforma);

    const calculated = calculateProformaTotals(dto.detalles);

    const proforma = this.proformaRepository.create({
      idProforma: dto.idProforma,
      nombreProyecto: dto.nombreProyecto,
      tiempoEjecucion: calculated.tiempoEjecucion,
      fecha: dto.fecha,
      notas: null,
      status: dto.status ?? ProformaStatus.DRAFT,
      profileId: dto.profileId,
      customerId: dto.customerId,
      subtotal: calculated.subtotal,
      iva: calculated.iva,
      totalGeneral: calculated.totalGeneral,
      montoContrato: calculated.montoContrato,
      detalles: this.mapDetailsToEntities(dto.idProforma, calculated.detalles),
    });

    const saved = await this.proformaRepository.save(proforma);
    return this.findOne(saved.idProforma);
  }

  /**
   * Actualiza una proforma en borrador, recalculando totales si se envían rubros.
   * Las proformas exportadas no pueden modificarse.
   */
  async update(idProforma: string, dto: UpdateProformaDto): Promise<Proforma> {
    const proforma = await this.findOne(idProforma);

    if (proforma.status === ProformaStatus.EXPORTED) {
      throw new BadRequestException(
        'No se puede editar una proforma que ya fue exportada',
      );
    }

    if (dto.profileId !== undefined || dto.customerId !== undefined) {
      await this.validateReferences(
        dto.profileId ?? proforma.profileId,
        dto.customerId ?? proforma.customerId,
      );
    }

    if (dto.nombreProyecto !== undefined) proforma.nombreProyecto = dto.nombreProyecto;
    if (dto.fecha !== undefined) proforma.fecha = dto.fecha;
    if (dto.status !== undefined) proforma.status = dto.status;
    if (dto.profileId !== undefined) proforma.profileId = dto.profileId;
    if (dto.customerId !== undefined) proforma.customerId = dto.customerId;

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

    await this.proformaRepository.save(proforma);
    return this.findOne(idProforma);
  }

  /**
   * Duplica la cabecera y todas sus líneas de detalle,
   * asignando un nuevo ID sugerido y estado DRAFT.
   */
  async clone(idProforma: string): Promise<Proforma> {
    const source = await this.findOne(idProforma);
    const { suggestedId } = await this.getNextSuggestedId();

    const calculated = calculateProformaTotals(
      source.detalles.map((linea) => this.mapEntityDetailToDto(linea)),
    );

    const clone = this.proformaRepository.create({
      idProforma: suggestedId,
      nombreProyecto: `${source.nombreProyecto} (copia)`,
      tiempoEjecucion: calculated.tiempoEjecucion,
      fecha: new Date().toISOString().slice(0, 10),
      notas: source.notas,
      status: ProformaStatus.DRAFT,
      profileId: source.profileId,
      customerId: source.customerId,
      subtotal: calculated.subtotal,
      iva: calculated.iva,
      totalGeneral: calculated.totalGeneral,
      montoContrato: calculated.montoContrato,
      detalles: this.mapDetailsToEntities(suggestedId, calculated.detalles),
    });

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
        });

        let proforma: Proforma;

        if (!existing) {
          proforma = await this.create(dto);
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

  /**
   * Impide crear proformas cuyo ID ya esté en uso,
   * con énfasis en registros exportados según la regla de negocio.
   */
  private async assertIdAvailableForCreate(idProforma: string): Promise<void> {
    const existing = await this.proformaRepository.findOne({
      where: { idProforma },
    });

    if (!existing) {
      return;
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
}
