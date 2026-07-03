import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DEFAULT_CATEGORY_NAME } from '../categories/default-category.constant';
import { CategoriesService } from '../categories/categories.service';
import { Category } from '../categories/entities/category.entity';
import { CatalogListResponseDto } from './dto/catalog-list-response.dto';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { ListCatalogQueryDto } from './dto/list-catalog-query.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';
import { ItemCatalog } from './entities/item-catalog.entity';

/** Límite máximo de resultados para autocompletado rápido (< 2 s) */
const MAX_SEARCH_RESULTS = 50;
const DEFAULT_SEARCH_LIMIT = 20;

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(ItemCatalog)
    private readonly itemCatalogRepository: Repository<ItemCatalog>,
    private readonly categoriesService: CategoriesService,
  ) {}

  async findAll(query: ListCatalogQueryDto = {}): Promise<CatalogListResponseDto> {
    const sortBy = query.sortBy ?? 'descripcion';
    const sortOrder = (query.sortOrder ?? 'asc').toUpperCase() as 'ASC' | 'DESC';
    const page = query.page ?? 1;
    const limit = query.limit === undefined ? 0 : query.limit;

    const qb = this.itemCatalogRepository.createQueryBuilder('item');

    if (query.categoriaNombre?.trim()) {
      qb.andWhere('item.categoriaNombre = :categoriaNombre', {
        categoriaNombre: query.categoriaNombre.trim(),
      });
    }

    const sortColumn =
      sortBy === 'codigo'
        ? 'item.codigoSugerido'
        : sortBy === 'costo'
          ? 'item.costoUnitario'
          : 'item.descripcion';

    qb.orderBy(sortColumn, sortOrder).addOrderBy('item.descripcion', 'ASC');

    const total = await qb.getCount();

    if (limit > 0) {
      qb.skip((page - 1) * limit).take(limit);
    }

    const items = await qb.getMany();

    return {
      items,
      total,
      page: limit > 0 ? page : 1,
      pageSize: limit > 0 ? limit : null,
    };
  }

  async findOne(id: number): Promise<ItemCatalog> {
    const item = await this.itemCatalogRepository.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException(`Rubro del catálogo con id ${id} no encontrado`);
    }

    return item;
  }

  async create(dto: CreateCatalogItemDto): Promise<ItemCatalog> {
    const categoria = await this.resolveCategory(dto.categoriaNombre);

    const item = this.itemCatalogRepository.create({
      codigoSugerido: dto.codigoSugerido ?? null,
      descripcion: dto.descripcion.trim(),
      unidad: dto.unidad,
      costoUnitario: dto.costoUnitario,
      diasLaborables: dto.diasLaborables ?? 1,
      ivaPercentage: dto.ivaPercentage ?? 15,
      categoria,
      categoriaNombre: categoria.nombre,
    });

    return this.itemCatalogRepository.save(item);
  }

  async update(id: number, dto: UpdateCatalogItemDto): Promise<ItemCatalog> {
    const item = await this.findOne(id);

    if (dto.codigoSugerido !== undefined) {
      item.codigoSugerido = dto.codigoSugerido;
    }
    if (dto.descripcion !== undefined) {
      item.descripcion = dto.descripcion.trim();
    }
    if (dto.unidad !== undefined) item.unidad = dto.unidad;
    if (dto.costoUnitario !== undefined) item.costoUnitario = dto.costoUnitario;
    if (dto.diasLaborables !== undefined) item.diasLaborables = dto.diasLaborables;
    if (dto.ivaPercentage !== undefined) item.ivaPercentage = dto.ivaPercentage;

    if (dto.categoriaNombre !== undefined) {
      item.categoria = await this.resolveCategory(dto.categoriaNombre);
      item.categoriaNombre = item.categoria.nombre;
    }

    return this.itemCatalogRepository.save(item);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.itemCatalogRepository.delete(id);
  }

  /**
   * Búsqueda inteligente por coincidencia parcial (LIKE) sobre descripción
   * y código sugerido, optimizada para autocompletado en la PWA.
   */
  async searchByText(
    term: string,
    limit = DEFAULT_SEARCH_LIMIT,
    categoriaNombre?: string,
  ): Promise<ItemCatalog[]> {
    const normalizedTerm = term.trim();

    if (!normalizedTerm) {
      return [];
    }

    const safeLimit = Math.min(Math.max(limit, 1), MAX_SEARCH_RESULTS);
    const likePattern = `%${normalizedTerm}%`;

    const qb = this.itemCatalogRepository
      .createQueryBuilder('item')
      .where('item.descripcion LIKE :term', { term: likePattern })
      .orWhere('item.codigoSugerido LIKE :term', { term: likePattern })
      .orderBy('item.descripcion', 'ASC')
      .take(safeLimit);

    if (categoriaNombre?.trim()) {
      qb.andWhere('item.categoriaNombre = :categoriaNombre', {
        categoriaNombre: categoriaNombre.trim(),
      });
    }

    return qb.getMany();
  }

  private async resolveCategory(
    categoriaNombre?: string | null,
  ): Promise<Category> {
    await this.categoriesService.ensureDefaultCategory();

    if (categoriaNombre === undefined || categoriaNombre === null) {
      return { nombre: DEFAULT_CATEGORY_NAME } as Category;
    }

    const nombre = categoriaNombre.trim();
    if (!nombre) {
      return { nombre: DEFAULT_CATEGORY_NAME } as Category;
    }

    await this.categoriesService.assertExists(nombre);
    return { nombre } as Category;
  }
}
