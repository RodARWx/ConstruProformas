import { IsOptional, IsString } from 'class-validator';

export class NotasSuggestionsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;
}
