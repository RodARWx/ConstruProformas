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

export class UpdateCatalogItemDto {
  @IsOptional()
  @IsString()
  codigoSugerido?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'La descripción no puede estar vacía' })
  descripcion?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'La unidad no puede estar vacía' })
  unidad?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El costo unitario debe ser un número válido' })
  @Min(0, { message: 'El costo unitario no puede ser negativo' })
  costoUnitario?: number;

  @IsOptional()
  @IsString()
  categoriaNombre?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Los días laborables deben ser un entero' })
  @Min(1, { message: 'Los días laborables deben ser al menos 1' })
  diasLaborables?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El porcentaje de IVA debe ser un número válido' })
  @Min(0, { message: 'El porcentaje de IVA no puede ser negativo' })
  @Max(100, { message: 'El porcentaje de IVA no puede superar 100' })
  ivaPercentage?: number;
}
