import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cors from 'cors';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import {
  buildCorsOptions,
  describeCorsOrigin,
  resolveCorsOrigin,
} from './config/cors.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOptions = buildCorsOptions();
  const expressApp = app.getHttpAdapter().getInstance();

  // CORS en Express ANTES del prefijo /api — evita 404 en preflight OPTIONS.
  expressApp.use(cors(corsOptions));
  expressApp.options(/.*/, cors(corsOptions));

  app.enableCors(corsOptions as any);

  // Prefijo global para todos los endpoints REST
  app.setGlobalPrefix('api');

  console.log(
    'CORS habilitado para:',
    describeCorsOrigin(resolveCorsOrigin()),
  );

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

  // Mensaje útil si alguien abre la URL raíz del backend (no es el frontend)
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/', (_req: unknown, res: { json: (body: unknown) => void }) => {
    res.json({
      status: 'ok',
      service: 'construproformas-api',
      message: 'Esta URL es solo la API. Abra la app web en el dominio del frontend.',
      health: '/api/health',
    });
  });

  await app.listen(port);

  console.log(`Construproformas API escuchando en http://localhost:${port}/api`);
}

bootstrap();
