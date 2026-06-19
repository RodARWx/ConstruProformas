import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ProformaStatus } from '../enums/proforma-status.enum';
import { UpdateProformaDetailDto } from './update-proforma-detail.dto';

/** DTO de entrada para editar una proforma existente en estado borrador */
export class UpdateProformaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El nombre del proyecto no puede estar vacío' })
  nombreProyecto?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha debe tener formato ISO válido (YYYY-MM-DD)' })
  fecha?: string;

  @IsOptional()
  @IsEnum(ProformaStatus)
  status?: ProformaStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El profileId debe ser un entero' })
  profileId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El customerId debe ser un entero' })
  customerId?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'La proforma debe tener al menos un rubro' })
  @ValidateNested({ each: true })
  @Type(() => UpdateProformaDetailDto)
  detalles?: UpdateProformaDetailDto[];
}
