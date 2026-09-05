import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { Profile } from '../profiles/entities/profile.entity';
import { Proforma } from './entities/proforma.entity';
import { ProformaDetail } from './entities/proforma-detail.entity';
import { ProformaCounter } from './entities/proforma-counter.entity';
import { ProformasController } from './proformas.controller';
import { ProformasService } from './proformas.service';
import { ExportModule } from '../export/export.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Proforma, ProformaDetail, Profile, Customer, ProformaCounter]),
    forwardRef(() => ExportModule),
  ],
  controllers: [ProformasController],
  providers: [ProformasService],
  exports: [ProformasService],
})
export class ProformasModule {}

