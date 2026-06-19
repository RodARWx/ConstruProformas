import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  RelationId,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';

/** Rubro del catálogo de ítems reutilizables en proformas */
@Entity('item_catalog')
export class ItemCatalog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', nullable: true })
  codigoSugerido: string | null;

  @Index('idx_item_catalog_descripcion')
  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'text' })
  unidad: string;

  @Column({ type: 'real', default: 0 })
  costoUnitario: number;

  /** Días laborables de referencia para el rubro (mínimo 1). */
  @Column({ type: 'integer', default: 1 })
  diasLaborables: number;

  /** Porcentaje de IVA aplicable al rubro (0–100). */
  @Column({ type: 'real', default: 15 })
  ivaPercentage: number;

  @ManyToOne(() => Category, (category) => category.rubros, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'categoriaNombre', referencedColumnName: 'nombre' })
  categoria: Category | null;

  @RelationId((item: ItemCatalog) => item.categoria)
  categoriaNombre: string | null;
}
