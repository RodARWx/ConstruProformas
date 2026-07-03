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
import { CreateProformaDetailDto } from './create-proforma-detail.dto';

/** DTO de entrada para crear una proforma con ID manual o sugerido */
export class CreateProformaDto {
  @IsString()
  @IsNotEmpty({ message: 'El ID de proforma es obligatorio' })
  idProforma: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre del proyecto es obligatorio' })
  nombreProyecto: string;

  @IsDateString({}, { message: 'La fecha debe tener formato ISO válido (YYYY-MM-DD)' })
  fecha: string;

  @IsOptional()
  @IsEnum(ProformaStatus)
  status?: ProformaStatus;

  @Type(() => Number)
  @IsInt({ message: 'El profileId debe ser un entero' })
  profileId: number;

  @Type(() => Number)
  @IsInt({ message: 'El customerId debe ser un entero' })
  customerId: number;

  @IsOptional()
  @IsString()
  notas?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'La proforma debe tener al menos un rubro' })
  @ValidateNested({ each: true })
  @Type(() => CreateProformaDetailDto)
  detalles: CreateProformaDetailDto[];
}
