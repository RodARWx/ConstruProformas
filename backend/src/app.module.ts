import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { ProfilesModule } from './profiles/profiles.module';
import { CustomersModule } from './customers/customers.module';
import { CatalogModule } from './catalog/catalog.module';
import { CategoriesModule } from './categories/categories.module';
import { ProformasModule } from './proformas/proformas.module';
import { DatabaseModule } from './database/database.module';
import { ExportModule } from './export/export.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: getDatabaseConfig,
    }),
    AuthModule,
    DatabaseModule,
    HealthModule,
    ProfilesModule,
    CustomersModule,
    CategoriesModule,
    CatalogModule,
    ProformasModule,
    ExportModule,
  ],
  controllers: [AppController],
  providers: [
    {
      // JwtAuthGuard reemplaza ApiKeyGuard como guard global.
      // Protege toda la API con Bearer JWT; @Public() marca rutas abiertas (health, login).
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
