import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { ItemCatalog } from '../catalog/entities/item-catalog.entity';
import { Profile } from '../profiles/entities/profile.entity';
import { CreateProformaDto } from './dto/create-proforma.dto';
import { NextIdResponse } from './dto/next-id-response.dto';
import { SyncProformasResult } from './dto/sync-result.dto';
import { UpdateProformaDto } from './dto/update-proforma.dto';
import { ProformaDetail } from './entities/proforma-detail.entity';
import { Proforma } from './entities/proforma.entity';
import { ProformaStatus } from './enums/proforma-status.enum';
import { calculateProformaTotals } from './helpers/proforma-calculator.helper';
import type { CalculatedProformaTotals } from './helpers/proforma-calculator.helper';
import { applyCustomerSnapshotToProforma } from './helpers/proforma-customer-snapshot.helper';
import { suggestNextProformaId } from './helpers/proforma-id.helper';
import { serializeProformaNotes, parseProformaNotes } from './helpers/proforma-notes.helper';
import { CreateProformaDetailDto } from './dto/create-proforma-detail.dto';
import { ExportService } from '../export/export.service';
import { ProformaExportResult } from '../export/dto/export-result.dto';

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
    @InjectRepository(ItemCatalog)
    private readonly itemCatalogRepository: Repository<ItemCatalog>,
    @Inject(forwardRef(() => ExportService))
    private readonly exportService: ExportService,
  ) {}

  private readonly defaultRelations = ['detalles', 'profile', 'customer'] as const;

  async findAll(): Promise<Proforma[]> {
    const proformas = await this.proformaRepository.find({
      relations: [...this.defaultRelations],
    });
    return proformas.sort((a, b) =>
      b.idProforma.localeCompare(a.idProforma, undefined, { numeric: true, sensitivity: 'base' })
    );
  }

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

  async getNextSuggestedId(): Promise<NextIdResponse> {
    const rows = await this.proformaRepository.find({
      select: ['idProforma'],
      withDeleted: true,
    });
    const existingIds = rows.map((row) => row.idProforma);
    return { suggestedId: suggestNextProformaId(existingIds) };
  }

  async create(dto: CreateProformaDto): Promise<Proforma> {
    const customer = await this.getCustomerOrFail(dto.customerId);
    await this.validateReferences(dto.profileId, dto.customerId);
    await this.assertIdAvailableForCreate(dto.idProforma);

    const calculated = await this.calculateTotalsForCustomer(
      dto.customerId,
      dto.detalles,
    );

    const proforma = this.proformaRepository.create({
      idProforma: dto.idProforma,
      nombreProyecto: dto.nombreProyecto,
      tiempoEjecucion: calculated.tiempoEjecucion,
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
    if (dto.notas !== undefined) {
      proforma.notas = serializeProformaNotes(dto.notas);
    }

    if (dto.detalles !== undefined) {
      const calculated = await this.calculateTotalsForCustomer(
        dto.customerId ?? proforma.customerId,
        dto.detalles,
      );
      proforma.subtotal = calculated.subtotal;
      proforma.iva = calculated.iva;
      proforma.totalGeneral = calculated.totalGeneral;
      proforma.montoContrato = calculated.montoContrato;
      proforma.tiempoEjecucion = calculated.tiempoEjecucion;

      await this.proformaDetailRepository.delete({ proformaId: idProforma });
      proforma.detalles = this.mapDetailsToEntities(idProforma, calculated.detalles);
    } else if (dto.customerId !== undefined) {
      const calculated = await this.calculateTotalsForCustomer(
        proforma.customerId,
        proforma.detalles.map((linea) => this.mapEntityDetailToDto(linea)),
      );
      proforma.subtotal = calculated.subtotal;
      proforma.iva = calculated.iva;
      proforma.totalGeneral = calculated.totalGeneral;
      proforma.montoContrato = calculated.montoContrato;
      proforma.tiempoEjecucion = calculated.tiempoEjecucion;
    }

    const customer = await this.getCustomerOrFail(proforma.customerId);
    applyCustomerSnapshotToProforma(proforma, customer);
    await this.proformaRepository.save(proforma);
    return this.findOne(idProforma);
  }

  async clone(idProforma: string): Promise<Proforma> {
    const source = await this.findOne(idProforma);
    const { suggestedId } = await this.getNextSuggestedId();

    const calculated = await this.calculateTotalsForCustomer(
      source.customerId,
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
      clienteNombre: source.clienteNombre,
      clienteRucCedula: source.clienteRucCedula,
      clienteDireccion: source.clienteDireccion,
      clienteTelefono: source.clienteTelefono,
      clienteCorreo: source.clienteCorreo,
      subtotal: calculated.subtotal,
      iva: calculated.iva,
      totalGeneral: calculated.totalGeneral,
      montoContrato: calculated.montoContrato,
      detalles: this.mapDetailsToEntities(suggestedId, calculated.detalles),
    });

    if (!clone.clienteNombre) {
      const customer = await this.getCustomerOrFail(clone.customerId);
      applyCustomerSnapshotToProforma(clone, customer);
    }

    const saved = await this.proformaRepository.save(clone);
    return this.findOne(saved.idProforma);
  }

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

  private async assertIdAvailableForCreate(idProforma: string): Promise<void> {
    const existing = await this.proformaRepository.findOne({
      where: { idProforma },
      withDeleted: true,
    });

    if (!existing) return;

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

  private async calculateTotalsForCustomer(
    customerId: number,
    detalles: CreateProformaDetailDto[],
  ): Promise<CalculatedProformaTotals> {
    const customer = await this.getCustomerOrFail(customerId);
    const rubroDiscountByCodigo = await this.buildRubroDiscountMap(detalles);

    return calculateProformaTotals(detalles, {
      customerDiscountPercentage: customer.discountPercentage ?? 0,
      rubroDiscountByCodigo,
    });
  }

  private async buildRubroDiscountMap(
    detalles: CreateProformaDetailDto[],
  ): Promise<Record<string, number>> {
    const codigos = [
      ...new Set(
        detalles
          .map((linea) => linea.codigo?.trim())
          .filter((codigo): codigo is string => Boolean(codigo)),
      ),
    ];

    if (codigos.length === 0) return {};

    const items = await this.itemCatalogRepository
      .createQueryBuilder('item')
      .where('item.codigoSugerido IN (:...codigos)', { codigos })
      .getMany();

    const map: Record<string, number> = {};
    for (const item of items) {
      if (item.codigoSugerido) {
        map[item.codigoSugerido] = item.discountPercentage ?? 0;
      }
    }
    return map;
  }

  async markAsExported(idProforma: string): Promise<void> {
    const proforma = await this.findOne(idProforma);
    proforma.status = ProformaStatus.EXPORTED;
    await this.proformaRepository.save(proforma);
  }

  // ✅ Método de exportación que usa ExportService
  async exportProforma(idProforma: string): Promise<ProformaExportResult> {
    await this.findOne(idProforma);
    return this.exportService.exportProforma(idProforma);
  }

  async remove(idProforma: string): Promise<void> {
    await this.findOne(idProforma);
    await this.proformaRepository.softDelete(idProforma);
  }

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