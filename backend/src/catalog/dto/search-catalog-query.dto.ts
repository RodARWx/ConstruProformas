import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

/** Parámetros de búsqueda inteligente para autocompletado del catálogo */
export class SearchCatalogQueryDto {
  @IsString()
  @IsNotEmpty({ message: 'El término de búsqueda (q) es obligatorio' })
  q: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  categoriaNombre?: string;
}
