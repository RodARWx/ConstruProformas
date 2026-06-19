import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Proforma } from './proforma.entity';

/** Línea de rubro dentro de una proforma */
@Entity('proforma_details')
export class ProformaDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', nullable: true })
  codigo: string | null;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'text', nullable: true })
  tiempo: string | null;

  @Column({ type: 'text' })
  unidad: string;

  @Column({ type: 'real', default: 0 })
  cantidad: number;

  @Column({ type: 'real', default: 0 })
  costoUnitario: number;

  @Column({ type: 'real', default: 0 })
  total: number;

  /** Encabezado de categoría (fila combinada A:G, no suma al total) */
  @Column({ type: 'boolean', default: false })
  esCategoria: boolean;

  @ManyToOne(() => Proforma, (proforma) => proforma.detalles, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'proformaId' })
  proforma: Proforma;

  @Column({ type: 'text' })
  proformaId: string;
}
