import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

/** Parámetros de búsqueda de clientes por nombre o RUC/Cédula. */
export class SearchCustomersQueryDto {
  @IsString()
  @IsNotEmpty({ message: 'El término de búsqueda (q) es obligatorio' })
  q: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
