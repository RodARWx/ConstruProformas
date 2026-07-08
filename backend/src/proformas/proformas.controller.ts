import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateProformaDto } from './dto/create-proforma.dto';
import { NextIdResponse } from './dto/next-id-response.dto';
import { NotasSuggestionsQueryDto } from './dto/notas-suggestions-query.dto';
import { SyncProformasDto } from './dto/sync-proformas.dto';
import { SyncProformasResult } from './dto/sync-result.dto';
import { UpdateProformaDto } from './dto/update-proforma.dto';
import { Proforma } from './entities/proforma.entity';
import { ProformasService } from './proformas.service';
import { ProformaExportResult } from '../export/dto/export-result.dto';

@Controller('proformas')
export class ProformasController {
  constructor(private readonly proformasService: ProformasService) {}

  @Get()
  findAll(): Promise<Proforma[]> {
    return this.proformasService.findAll();
  }

  @Get('trash')
  findTrash(): Promise<Proforma[]> {
    return this.proformasService.findTrash();
  }

  @Delete('trash/:id')
  permanentRemove(@Param('id') id: string): Promise<void> {
    return this.proformasService.permanentRemove(id);
  }

  @Get('next-id')
  getNextId(): Promise<NextIdResponse> {
    return this.proformasService.getNextSuggestedId();
  }

  @Get('notas/suggestions')
  getNotasSuggestions(@Query() query: NotasSuggestionsQueryDto): Promise<string[]> {
    return this.proformasService.getNotasSuggestions(query.q);
  }

  @Post('sync')
  sync(@Body() dto: SyncProformasDto): Promise<SyncProformasResult> {
    return this.proformasService.syncBatch(dto.proformas);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Proforma> {
    return this.proformasService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProformaDto): Promise<Proforma> {
    return this.proformasService.create(dto);
  }

  @Post(':id/clone')
  clone(@Param('id') id: string): Promise<Proforma> {
    return this.proformasService.clone(id);
  }

  @Patch(':id/restore')
  restore(@Param('id') id: string): Promise<Proforma> {
    return this.proformasService.restore(id);
  }

  @Post(':id/export')
  exportProforma(@Param('id') id: string): Promise<ProformaExportResult> {
    return this.proformasService.exportProforma(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProformaDto,
  ): Promise<Proforma> {
    return this.proformasService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.proformasService.remove(id);
  }
}