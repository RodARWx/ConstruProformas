import { IsOptional, IsString } from 'class-validator';

/** Solo la descripción es editable; el nombre es la PK de negocio. */
export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  descripcion?: string | null;
}
