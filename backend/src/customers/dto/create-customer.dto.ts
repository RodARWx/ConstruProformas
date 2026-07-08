import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del cliente es obligatorio' })
  nombreCliente: string;

  @IsString()
  @IsNotEmpty({ message: 'El RUC/Cédula es obligatorio' })
  rucCedula: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo debe ser válido' })
  correo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El descuento debe ser un número válido' })
  @Min(0, { message: 'El descuento no puede ser negativo' })
  discountPercentage?: number;
}
