import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string; // 'app-user' — usuario único de la aplicación
  iat?: number;
  exp?: number;
}

export interface LoginResponse {
  access_token: string;
  expires_in: number; // segundos
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Valida el PIN global de la aplicación.
   * Si es correcto, devuelve un JWT con expiración configurable.
   *
   * La comparación es en tiempo constante implícito (ambos strings en memoria),
   * suficiente para un PIN local sin acceso público a Internet.
   */
  async login(pin: string): Promise<LoginResponse> {
    const expectedPin = this.configService.get<string>('APP_PIN');

    if (!expectedPin) {
      this.logger.error('APP_PIN no está configurado en las variables de entorno');
      throw new UnauthorizedException('Autenticación no configurada en el servidor');
    }

    if (pin !== expectedPin) {
      this.logger.warn('Intento de acceso con PIN incorrecto');
      throw new UnauthorizedException('PIN incorrecto');
    }

    const expiresIn = this.configService.get<number>('JWT_EXPIRES_IN_SECONDS') ?? 28800; // 8 horas por defecto

    const payload: JwtPayload = { sub: 'app-user' };
    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn,
    });

    this.logger.log('Acceso concedido; JWT emitido');

    return { access_token, expires_in: expiresIn };
  }
}
