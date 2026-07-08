import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { ItemCatalog } from '../catalog/entities/item-catalog.entity';
import { Profile } from '../profiles/entities/profile.entity';
import { Proforma } from './entities/proforma.entity';
import { ProformaDetail } from './entities/proforma-detail.entity';
import { ProformasController } from './proformas.controller';
import { ProformasService } from './proformas.service';
import { ExportModule } from '../export/export.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Proforma,
      ProformaDetail,
      Profile,
      Customer,
      ItemCatalog,
    ]),
    forwardRef(() => ExportModule), // ✅ Ya está
  ],
  controllers: [ProformasController],
  providers: [ProformasService],
  exports: [ProformasService],
})
export class ProformasModule {}