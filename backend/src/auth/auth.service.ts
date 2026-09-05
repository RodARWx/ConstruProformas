import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';

export interface JwtPayload {
  sub: string; // 'app-user' — usuario único de la aplicación
  iat?: number;
  exp?: number;
}

export interface LoginResponse {
  access_token: string;
  expires_in: number; // segundos
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 1000; // 30 segundos

/**
 * Compara dos cadenas en tiempo constante para mitigar ataques de temporización (timing attacks).
 */
export function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private failedAttempts = 0;
  private lockoutUntil = 0;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Valida el PIN global de la aplicación con mitigación de ataques de temporización
   * y bloqueo tras 5 intentos fallidos consecutivos (30 segundos).
   * Si es correcto, devuelve un JWT con expiración configurable (por defecto 8 horas).
   */
  async login(pin: string): Promise<LoginResponse> {
    const now = Date.now();
    if (this.lockoutUntil > now) {
      const secondsRemaining = Math.ceil((this.lockoutUntil - now) / 1000);
      this.logger.warn(
        `Intento de login bloqueado por exceso de intentos fallidos. Segundos restantes: ${secondsRemaining}`,
      );
      throw new HttpException(
        `Demasiados intentos fallidos. Por favor espere ${secondsRemaining} segundo(s) antes de intentar nuevamente.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const expectedPin =
      this.configService.get<string>('APP_PIN') ??
      process.env.APP_PIN ??
      '2585';

    const isValid = timingSafeCompare(pin.trim(), expectedPin.trim());

    if (!isValid) {
      this.failedAttempts += 1;
      this.logger.warn(
        `Intento de acceso con PIN incorrecto (${this.failedAttempts}/${MAX_FAILED_ATTEMPTS})`,
      );

      if (this.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        this.lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
        this.failedAttempts = 0;
        throw new HttpException(
          'Demasiados intentos fallidos. El acceso ha sido bloqueado temporalmente por 30 segundos.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new UnauthorizedException('PIN incorrecto');
    }

    // PIN correcto: restablecer contador y bloqueo
    this.failedAttempts = 0;
    this.lockoutUntil = 0;

    const rawExpires =
      this.configService.get<string | number>('JWT_EXPIRES_IN_SECONDS') ??
      process.env.JWT_EXPIRES_IN_SECONDS ??
      28800;
    const expiresIn = Number(rawExpires) || 28800; // 28800 segundos = 8 horas

    const payload: JwtPayload = { sub: 'app-user' };
    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn,
    });

    this.logger.log(
      `Acceso concedido; JWT emitido con vigencia de ${expiresIn}s (${(expiresIn / 3600).toFixed(1)}h)`,
    );

    return { access_token, expires_in: expiresIn };
  }

  /**
   * Restablece el contador de intentos fallidos (utilidad para tests y reset administrativo).
   */
  resetBruteForce(): void {
    this.failedAttempts = 0;
    this.lockoutUntil = 0;
  }
}

