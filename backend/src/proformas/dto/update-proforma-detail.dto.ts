import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

/** DTO de validación para una línea de rubro al editar una proforma existente */
export class UpdateProformaDetailDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsBoolean()
  esCategoria?: boolean;

  @IsOptional()
  @IsString()
  codigo?: string;

  @IsString()
  @IsNotEmpty({
    message: 'La descripción del rubro o el título de la categoría es obligatorio',
  })
  descripcion: string;

  @IsOptional()
  @IsString()
  tiempo?: string;

  @ValidateIf((linea) => !linea.esCategoria)
  @IsString()
  @IsNotEmpty({ message: 'La unidad del rubro es obligatoria' })
  unidad?: string;

  @ValidateIf((linea) => !linea.esCategoria)
  @Type(() => Number)
  @IsNumber({}, { message: 'La cantidad debe ser un número válido' })
  @Min(0, { message: 'La cantidad no puede ser negativa' })
  cantidad?: number;

  @ValidateIf((linea) => !linea.esCategoria)
  @Type(() => Number)
  @IsNumber({}, { message: 'El costo unitario debe ser un número válido' })
  @Min(0, { message: 'El costo unitario no puede ser negativo' })
  costoUnitario?: number;
}
