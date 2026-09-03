import { Entity, PrimaryColumn, Column } from 'typeorm';

/**
 * Tabla de contadores atómicos por año para IDs de proforma.
 * Cada fila representa el último número secuencial asignado en un año dado.
 *
 * El incremento se hace con UPDATE ... SET lastSequence = lastSequence + 1 RETURNING
 * dentro de una transacción serializable, garantizando que dos usuarios simultáneos
 * nunca obtengan el mismo número.
 */
@Entity('proforma_counters')
export class ProformaCounter {
  /** El año: 2026, 2027, etc. */
  @PrimaryColumn({ type: 'integer' })
  year: number;

  /** Último número secuencial asignado en este año. */
  @Column({ type: 'integer', default: 0 })
  lastSequence: number;
}
