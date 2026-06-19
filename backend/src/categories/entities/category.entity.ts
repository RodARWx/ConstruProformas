import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { ItemCatalog } from '../../catalog/entities/item-catalog.entity';

/**
 * Categoría de rubros del catálogo.
 * El campo `nombre` es la clave primaria e identificador de negocio (único).
 */
@Entity('categories')
export class Category {
  @PrimaryColumn({ type: 'text' })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @OneToMany(() => ItemCatalog, (item) => item.categoria)
  rubros: ItemCatalog[];
}
