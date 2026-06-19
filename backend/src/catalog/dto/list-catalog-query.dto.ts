import { IsOptional, IsString } from 'class-validator';

/** Filtros opcionales para listar rubros del catálogo. */
export class ListCatalogQueryDto {
  @IsOptional()
  @IsString()
  categoriaNombre?: string;
}
