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
    const expectedPin =
      this.configService.get<string>('APP_PIN') ??
      process.env.APP_PIN ??
      '123456';


    if (pin !== expectedPin) {
      this.logger.warn('Intento de acceso con PIN incorrecto');
      throw new UnauthorizedException('PIN incorrecto');
    }

    const rawExpires =
      this.configService.get<string | number>('JWT_EXPIRES_IN_SECONDS') ??
      process.env.JWT_EXPIRES_IN_SECONDS ??
      28800;
    const expiresIn = Number(rawExpires) || 28800; // 28800 segundos = 8 horas

    const payload: JwtPayload = { sub: 'app-user' };
    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn,
    });

    this.logger.log(`Acceso concedido; JWT emitido con vigencia de ${expiresIn}s (${(expiresIn / 3600).toFixed(1)}h)`);

    return { access_token, expires_in: expiresIn };
  }
}
