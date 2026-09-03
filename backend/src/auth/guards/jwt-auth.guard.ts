import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

/**
 * Guard global JWT.
 * Protege todos los endpoints con Bearer token.
 * Las rutas marcadas con @Public() pasan sin autenticación.
 * Las solicitudes OPTIONS (preflight CORS) siempre pasan.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    // Rutas públicas (health, login)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Preflight CORS no lleva token
    const request = context.switchToHttp().getRequest<{ method: string }>();
    if (request.method === 'OPTIONS') return true;

    return super.canActivate(context) as boolean | Promise<boolean>;
  }

  handleRequest<TUser>(err: Error | null, user: TUser): TUser {
    if (err || !user) {
      throw new UnauthorizedException(
        err?.message ?? 'Token inválido o sesión expirada',
      );
    }
    return user;
  }
}
