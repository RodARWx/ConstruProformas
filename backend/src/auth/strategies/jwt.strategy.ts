import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../auth.service';

/**
 * Estrategia Passport-JWT.
 * Extrae el token del encabezado Authorization: Bearer <token>.
 * Valida firma y expiración automáticamente.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') ?? 'construproformas-dev-secret',
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
