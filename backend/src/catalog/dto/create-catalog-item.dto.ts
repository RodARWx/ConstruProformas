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

export class CreateCatalogItemDto {
  @IsOptional()
  @IsString()
  codigoSugerido?: string;

  @IsString()
  @IsNotEmpty({ message: 'La descripción del rubro es obligatoria' })
  descripcion: string;

  @IsString()
  @IsNotEmpty({ message: 'La unidad es obligatoria' })
  unidad: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'El costo unitario debe ser un número válido' })
  @Min(0, { message: 'El costo unitario no puede ser negativo' })
  costoUnitario: number;

  @IsOptional()
  @IsString()
  categoriaNombre?: string;

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

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El descuento debe ser un número válido' })
  @Min(0, { message: 'El descuento no puede ser negativo' })
  discountPercentage?: number;
}
