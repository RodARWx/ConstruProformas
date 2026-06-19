import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { Profile } from '../profiles/entities/profile.entity';
import { Proforma } from '../proformas/entities/proforma.entity';
import { DatabaseSeedService } from './database-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Profile, Customer, Proforma])],
  providers: [DatabaseSeedService],
})
export class DatabaseModule {}
