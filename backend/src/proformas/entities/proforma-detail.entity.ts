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

  /** Días laborables de la línea (copiados del catálogo, editables por proforma). */
  @Column({ type: 'integer', default: 1 })
  diasLaborables: number;

  /** Porcentaje de IVA de la línea (0–100, copiado del catálogo, editable por proforma). */
  @Column({ type: 'real', default: 15 })
  ivaPercentage: number;

  @ManyToOne(() => Proforma, (proforma) => proforma.detalles, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'proformaId' })
  proforma: Proforma;

  @Column({ type: 'text' })
  proformaId: string;
}
