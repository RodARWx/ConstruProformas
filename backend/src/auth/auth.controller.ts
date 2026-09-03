import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService, LoginResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Valida el PIN de la aplicación y devuelve un JWT.
   * Ruta pública (no requiere autenticación previa).
   *
   * POST /api/auth/login
   * Body: { "pin": "1234" }
   * Response: { "access_token": "eyJ...", "expires_in": 28800 }
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(dto.pin);
  }
}
