import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { Profile } from '../profiles/entities/profile.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Category } from '../categories/entities/category.entity';
import { ItemCatalog } from '../catalog/entities/item-catalog.entity';
import { Proforma } from '../proformas/entities/proforma.entity';
import { ProformaDetail } from '../proformas/entities/proforma-detail.entity';

export function getDatabaseConfig(): TypeOrmModuleOptions {
  const databasePath =
    process.env.DATABASE_PATH ?? join(process.cwd(), 'data', 'construproformas.db');

  // Asegura que el directorio del archivo .db exista antes de conectar
  const databaseDir = dirname(databasePath);
  if (!existsSync(databaseDir)) {
    mkdirSync(databaseDir, { recursive: true });
  }

  const synchronize =
    process.env.DB_SYNCHRONIZE === 'true' ||
    process.env.NODE_ENV !== 'production';

  return {
    type: 'better-sqlite3',
    database: databasePath,
    entities: [Profile, Customer, Category, ItemCatalog, Proforma, ProformaDetail],
    synchronize,
    logging: process.env.NODE_ENV !== 'production',
  };
}
