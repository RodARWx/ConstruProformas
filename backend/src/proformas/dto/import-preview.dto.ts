import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/** Rubro crudo extraído por el frontend desde un archivo Excel */
export class ImportRubroDto {
  @IsOptional()
  @IsBoolean()
  esCategoria?: boolean;

  @IsOptional()
  @IsString()
  codigo?: string;

  @IsString()
  @IsNotEmpty({ message: 'La descripción del rubro es obligatoria' })
  descripcion: string;

  @IsOptional()
  @IsString()
  tiempo?: string;

  @ValidateIf((rubro) => !rubro.esCategoria)
  @IsString()
  @IsNotEmpty({ message: 'La unidad del rubro es obligatoria' })
  unidad?: string;

  @ValidateIf((rubro) => !rubro.esCategoria)
  @Type(() => Number)
  @IsNumber({}, { message: 'La cantidad debe ser un número válido' })
  @Min(0, { message: 'La cantidad no puede ser negativa' })
  cantidad?: number;

  @ValidateIf((rubro) => !rubro.esCategoria)
  @Type(() => Number)
  @IsNumber({}, { message: 'El costo unitario debe ser un número válido' })
  @Min(0, { message: 'El costo unitario no puede ser negativo' })
  costoUnitario?: number;
}

/** Entrada del endpoint POST /proformas/import-preview */
export class ImportPreviewDto {
  @IsBoolean()
  appliesIva: boolean;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe incluir al menos un rubro para previsualizar' })
  @ValidateNested({ each: true })
  @Type(() => ImportRubroDto)
  rubros: ImportRubroDto[];
}
