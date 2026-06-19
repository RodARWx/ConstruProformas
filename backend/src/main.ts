import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

/** Orígenes permitidos para CORS (lista separada por comas o `*`). */
function resolveCorsOrigin(): boolean | string | string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) {
    return false;
  }
  if (raw === '*') {
    return true;
  }
  const origins = raw.split(',').map((origin) => origin.trim()).filter(Boolean);
  if (origins.length === 0) {
    return false;
  }
  return origins.length === 1 ? origins[0] : origins;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefijo global para todos los endpoints REST
  app.setGlobalPrefix('api');

  const corsOrigin = resolveCorsOrigin();
  if (corsOrigin) {
    app.enableCors({
      origin: corsOrigin,
      credentials: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-KEY'],
    });
  }

  // Validación automática de DTOs entrantes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Filtro global para normalizar errores hacia el frontend
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);

  console.log(`Construproformas API escuchando en http://localhost:${port}/api`);
}

bootstrap();
