import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Filtros y paginación para listar rubros del catálogo. */
export class ListCatalogQueryDto {
  @IsOptional()
  @IsString()
  categoriaNombre?: string;

  @IsOptional()
  @IsIn(['codigo', 'descripcion', 'costo'])
  sortBy?: 'codigo' | 'descripcion' | 'costo';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  /** 0 = todos los registros (sin paginar). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500)
  limit?: number;
}
