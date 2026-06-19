import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/** DTO de validación para una línea de rubro al crear o sincronizar proformas */
export class CreateProformaDetailDto {
  @IsOptional()
  @IsString()
  codigo?: string;

  @IsString()
  @IsNotEmpty({ message: 'La descripción del rubro es obligatoria' })
  descripcion: string;

  @IsOptional()
  @IsString()
  tiempo?: string;

  @IsString()
  @IsNotEmpty({ message: 'La unidad del rubro es obligatoria' })
  unidad: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'La cantidad debe ser un número válido' })
  @Min(0, { message: 'La cantidad no puede ser negativa' })
  cantidad: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'El costo unitario debe ser un número válido' })
  @Min(0, { message: 'El costo unitario no puede ser negativo' })
  costoUnitario: number;

  @Type(() => Number)
  @IsInt({ message: 'Los días laborables deben ser un entero' })
  @Min(1, { message: 'Los días laborables deben ser al menos 1' })
  diasLaborables: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'El porcentaje de IVA debe ser un número válido' })
  @Min(0, { message: 'El porcentaje de IVA no puede ser negativo' })
  @Max(100, { message: 'El porcentaje de IVA no puede superar 100' })
  ivaPercentage: number;
}
