import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItemCatalog } from '../catalog/entities/item-catalog.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(ItemCatalog)
    private readonly itemCatalogRepository: Repository<ItemCatalog>,
  ) {}

  /**
   * Lista categorías con sus rubros asociados.
   * Categorías y rubros ordenados alfabéticamente.
   */
  async findAll(): Promise<Category[]> {
    return this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.rubros', 'rubros')
      .orderBy('category.nombre', 'ASC')
      .addOrderBy('rubros.descripcion', 'ASC')
      .getMany();
  }

  async findOne(nombre: string): Promise<Category> {
    const category = await this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.rubros', 'rubros')
      .where('category.nombre = :nombre', { nombre })
      .orderBy('rubros.descripcion', 'ASC')
      .getOne();

    if (!category) {
      throw new NotFoundException(`Categoría "${nombre}" no encontrada`);
    }

    return category;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const nombre = dto.nombre.trim();
    await this.assertNombreAvailable(nombre);

    const category = this.categoryRepository.create({
      nombre,
      descripcion: dto.descripcion?.trim() || null,
      rubros: [],
    });

    return this.categoryRepository.save(category);
  }

  async update(nombre: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(nombre);

    if (dto.descripcion !== undefined) {
      category.descripcion = dto.descripcion?.trim() || null;
    }

    return this.categoryRepository.save(category);
  }

  /**
   * Elimina una categoría solo si no tiene rubros del catálogo asociados.
   * Si tiene rubros, responde 409: debe reasignarlos antes de eliminar.
   */
  async remove(nombre: string): Promise<void> {
    await this.findOne(nombre);

    const rubrosCount = await this.itemCatalogRepository
      .createQueryBuilder('item')
      .where('item.categoriaNombre = :nombre', { nombre })
      .getCount();

    if (rubrosCount > 0) {
      throw new ConflictException(
        `No se puede eliminar la categoría "${nombre}": tiene ${rubrosCount} rubro(s) asociado(s). ` +
          'Reasigne esos rubros a otra categoría desde Catálogo antes de eliminar.',
      );
    }

    await this.categoryRepository.delete({ nombre });
  }

  async assertExists(nombre: string): Promise<void> {
    const exists = await this.categoryRepository.exists({ where: { nombre } });
    if (!exists) {
      throw new NotFoundException(`Categoría "${nombre}" no encontrada`);
    }
  }

  private async assertNombreAvailable(nombre: string): Promise<void> {
    const exists = await this.categoryRepository.exists({ where: { nombre } });
    if (exists) {
      throw new ConflictException(
        `La categoría "${nombre}" ya existe`,
      );
    }
  }
}
