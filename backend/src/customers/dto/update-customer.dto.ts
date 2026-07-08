import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El nombre del cliente no puede estar vacío' })
  nombreCliente?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El RUC/Cédula no puede estar vacío' })
  rucCedula?: string;

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
