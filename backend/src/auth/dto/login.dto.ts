import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(4, { message: 'El PIN debe tener al menos 4 caracteres' })
  pin: string;
}
