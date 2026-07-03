import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync } from 'fs';
import { In, IsNull, Repository } from 'typeorm';
import { ItemCatalog } from '../catalog/entities/item-catalog.entity';
import { DEFAULT_CATEGORY_NAME } from '../categories/default-category.constant';
import { Category } from '../categories/entities/category.entity';
import { GENERIC_CUSTOMER } from '../customers/generic-customer.constant';
import { Customer } from '../customers/entities/customer.entity';
import {
  FIXED_PROFILES,
  profileMatchesFixed,
} from '../profiles/fixed-profiles.constant';
import { Profile } from '../profiles/entities/profile.entity';
import { Proforma } from '../proformas/entities/proforma.entity';
import {
  DEFAULT_CATALOG_UNIT,
  DEFAULT_CATALOG_UNIT_COST,
  readCatalogProductsFromExcel,
  resolveProductosExcelPath,
} from './catalog-excel.seed';

/**
 * Siembra datos mínimos al iniciar la aplicación.
 * Perfiles: exactamente dos registros fijos de Construmétrica (ids 1 y 2).
 * Cliente id=1: dato de prueba para validación referencial de proformas.
 * Catálogo: categorías y rubros desde seed-data/productos.xlsx (idempotente).
 */
@Injectable()
export class DatabaseSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseSeedService.name);

  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Proforma)
    private readonly proformaRepository: Repository<Proforma>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(ItemCatalog)
    private readonly itemCatalogRepository: Repository<ItemCatalog>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedProfiles();
    await this.seedDefaultCategory();
    await this.seedCustomer();
    await this.seedGenericCustomer();
    await this.assignUncategorizedRubros();
    await this.seedCatalogFromExcel();
  }

  /**
   * Garantiza EXACTAMENTE los dos perfiles oficiales.
   * Si hay perfiles distintos (p. ej. el de prueba anterior), los elimina
   * tras reasignar proformas huérfanas al perfil id=1.
   */
  private async seedProfiles(): Promise<void> {
    const existing = await this.profileRepository.find({ order: { id: 'ASC' } });

    const alreadyCanonical =
      existing.length === FIXED_PROFILES.length &&
      FIXED_PROFILES.every((expected) => {
        const found = existing.find((profile) => profile.id === expected.id);
        return found !== undefined && profileMatchesFixed(found, expected);
      });

    if (alreadyCanonical) {
      return;
    }

    const allowedIds = FIXED_PROFILES.map((profile) => profile.id);
    const extraProfileIds = existing
      .map((profile) => profile.id)
      .filter((id) => !allowedIds.includes(id));

    if (extraProfileIds.length > 0) {
      await this.proformaRepository.update(
        { profileId: In(extraProfileIds) },
        { profileId: 1 },
      );
      await this.profileRepository.delete({ id: In(extraProfileIds) });
      this.logger.warn(
        `Perfiles no oficiales eliminados: [${extraProfileIds.join(', ')}]`,
      );
    }

    for (const profile of FIXED_PROFILES) {
      await this.profileRepository.save(profile);
    }

    this.logger.log(
      `Perfiles oficiales sincronizados (${FIXED_PROFILES.length} registros, ids 1 y 2)`,
    );
  }

  private async seedCustomer(): Promise<void> {
    const exists = await this.customerRepository.exists({ where: { id: 1 } });
    if (exists) {
      return;
    }

    await this.customerRepository.save({
      id: 1,
      nombreCliente: 'Constructora Andina S.A.',
      rucCedula: '1790123456001',
      direccion: 'Av. Amazonas N12-34, Quito',
      telefono: '022345678',
      correo: 'contacto@constructoraandina.com',
    });

    this.logger.log('Cliente de prueba insertado (id: 1)');
  }

  /** Categoría obligatoria para rubros sin clasificación. */
  private async seedDefaultCategory(): Promise<void> {
    const exists = await this.categoryRepository.exists({
      where: { nombre: DEFAULT_CATEGORY_NAME },
    });

    if (exists) {
      return;
    }

    await this.categoryRepository.save({
      nombre: DEFAULT_CATEGORY_NAME,
      descripcion:
        'Rubros sin categoría asignada. Categoría protegida del sistema.',
    });

    this.logger.log(`Categoría por defecto insertada (${DEFAULT_CATEGORY_NAME})`);
  }

  /** Cliente genérico "A quien interese" para proformas sin contratante. */
  private async seedGenericCustomer(): Promise<void> {
    const existing = await this.customerRepository.findOne({
      where: { rucCedula: GENERIC_CUSTOMER.rucCedula },
    });

    if (existing) {
      return;
    }

    await this.customerRepository.save({
      nombreCliente: GENERIC_CUSTOMER.nombreCliente,
      rucCedula: GENERIC_CUSTOMER.rucCedula,
      direccion: GENERIC_CUSTOMER.direccion || null,
      telefono: GENERIC_CUSTOMER.telefono,
      correo: GENERIC_CUSTOMER.correo,
    });

    this.logger.log('Cliente genérico "A quien interese" insertado');
  }

  /** Reasigna rubros huérfanos a la categoría por defecto. */
  private async assignUncategorizedRubros(): Promise<void> {
    const nullResult = await this.itemCatalogRepository.update(
      { categoriaNombre: IsNull() },
      { categoriaNombre: DEFAULT_CATEGORY_NAME },
    );

    const emptyResult = await this.itemCatalogRepository
      .createQueryBuilder()
      .update(ItemCatalog)
      .set({ categoriaNombre: DEFAULT_CATEGORY_NAME })
      .where("categoriaNombre = ''")
      .execute();

    const affected = (nullResult.affected ?? 0) + (emptyResult.affected ?? 0);

    if (affected > 0) {
      this.logger.log(
        `${affected} rubro(s) reasignados a "${DEFAULT_CATEGORY_NAME}"`,
      );
    }
  }

  /**
   * Carga categorías y rubros desde productos.xlsx al arrancar.
   * Idempotente: omite rubros cuyo codigoSugerido ya exista.
   */
  private async seedCatalogFromExcel(): Promise<void> {
    const excelPath = resolveProductosExcelPath();
    if (!existsSync(excelPath)) {
      this.logger.warn(
        `Seed de catálogo omitido: no existe ${excelPath}. ` +
          'Coloque seed-data/productos.xlsx en la raíz del backend.',
      );
      return;
    }

    try {
      const products = await readCatalogProductsFromExcel(excelPath);
      let categoriesCreated = 0;
      let itemsCreated = 0;
      let itemsSkipped = 0;

      for (const product of products) {
        const categoryExists = await this.categoryRepository.exists({
          where: { nombre: product.categoriaNombre },
        });

        if (!categoryExists) {
          await this.categoryRepository.save({
            nombre: product.categoriaNombre,
            descripcion: null,
          });
          categoriesCreated += 1;
        }

        const duplicateItem = await this.itemCatalogRepository.findOne({
          where: { codigoSugerido: product.codigoSugerido },
        });

        if (duplicateItem) {
          itemsSkipped += 1;
          continue;
        }

        await this.itemCatalogRepository.save({
          codigoSugerido: product.codigoSugerido,
          descripcion: product.descripcion,
          unidad: DEFAULT_CATALOG_UNIT,
          costoUnitario: DEFAULT_CATALOG_UNIT_COST,
          diasLaborables: 1,
          ivaPercentage: product.ivaPercentage,
          categoriaNombre: product.categoriaNombre,
        });
        itemsCreated += 1;
      }

      this.logger.log(
        `Catálogo desde Excel: ${products.length} fila(s), ` +
          `${categoriesCreated} categoría(s) nuevas, ` +
          `${itemsCreated} rubro(s) insertados, ${itemsSkipped} omitidos (código duplicado)`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`No se pudo sembrar el catálogo desde Excel: ${message}`);
    }
  }
}
