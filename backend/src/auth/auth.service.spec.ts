import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpStatus, UnauthorizedException, HttpException } from '@nestjs/common';
import { AuthService, timingSafeCompare } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'APP_PIN') return '2585';
      if (key === 'JWT_EXPIRES_IN_SECONDS') return 28800;
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    service.resetBruteForce();
    jest.clearAllMocks();
  });

  describe('timingSafeCompare', () => {
    it('debe retornar true para cadenas idénticas', () => {
      expect(timingSafeCompare('2585', '2585')).toBe(true);
      expect(timingSafeCompare('secret-pin', 'secret-pin')).toBe(true);
    });

    it('debe retornar false para cadenas distintas de igual longitud', () => {
      expect(timingSafeCompare('2585', '2586')).toBe(false);
    });

    it('debe retornar false para cadenas de distinta longitud sin lanzar error', () => {
      expect(timingSafeCompare('258', '2585')).toBe(false);
      expect(timingSafeCompare('258599', '2585')).toBe(false);
    });
  });

  describe('login', () => {
    it('debe conceder acceso y retornar un JWT cuando el PIN es correcto', async () => {
      const result = await service.login('2585');

      expect(result).toEqual({
        access_token: 'mock-jwt-token',
        expires_in: 28800,
      });
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: 'app-user' },
        { expiresIn: 28800 },
      );
    });

    it('debe rechazar con UnauthorizedException si el PIN es incorrecto', async () => {
      await expect(service.login('999999')).rejects.toThrow(UnauthorizedException);
    });

    it('debe activar bloqueo por fuerza bruta (429) tras 5 intentos fallidos', async () => {
      // 4 intentos fallidos: lanzan UnauthorizedException
      for (let i = 0; i < 4; i++) {
        await expect(service.login('wrong-pin')).rejects.toThrow(UnauthorizedException);
      }

      // 5to intento fallido: lanza HttpException TOO_MANY_REQUESTS
      try {
        await service.login('wrong-pin');
        fail('Debió lanzar HttpException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(err.message).toContain('bloqueado temporalmente');
      }

      // 6to intento dentro del período de bloqueo: sigue bloqueado
      try {
        await service.login('2585'); // incluso con PIN correcto
        fail('Debió permanecer bloqueado');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
    });

    it('debe reiniciar el contador de fallos tras un login exitoso', async () => {
      // 2 fallos
      await expect(service.login('wrong')).rejects.toThrow(UnauthorizedException);
      await expect(service.login('wrong')).rejects.toThrow(UnauthorizedException);

      // 1 éxito
      const ok = await service.login('2585');
      expect(ok.access_token).toBe('mock-jwt-token');

      // Si falla de nuevo, debe ser el intento 1 (no el intento 3)
      await expect(service.login('wrong')).rejects.toThrow(UnauthorizedException);
    });
  });
});
