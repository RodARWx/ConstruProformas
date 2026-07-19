import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsIn,
  Matches,
  Min,
} from 'class-validator';
import { IsEcuadorianId } from '../../common/decorators/is-ecuadorian-id.decorator';
import { QUITO_POSTAL_CODES } from '../../common/constants/quito-postal-codes.constant';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del cliente es obligatorio' })
  nombreCliente: string;

  @IsString()
  @IsNotEmpty({ message: 'El RUC/Cédula es obligatorio' })
  @IsEcuadorianId({ message: 'El RUC/Cédula no es válido matemáticamente' })
  rucCedula: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[\d\s\-\+\(\)]{7,15}$/, { message: 'El teléfono debe contener entre 7 y 15 números/símbolos válidos' })
  telefono?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo debe ser válido' })
  correo?: string;

  @IsOptional()
  @IsString()
  @IsIn(QUITO_POSTAL_CODES, { message: 'El código postal debe ser válido para el cantón Quito' })
  codigoPostal?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El descuento debe ser un número válido' })
  @Min(0, { message: 'El descuento no puede ser negativo' })
  discountPercentage?: number;
}
