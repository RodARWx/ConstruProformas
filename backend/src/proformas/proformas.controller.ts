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

@Controller('proformas')
export class ProformasController {
  constructor(private readonly proformasService: ProformasService) {}

  /** Lista todas las proformas activas con sus relaciones */
  @Get()
  findAll(): Promise<Proforma[]> {
    return this.proformasService.findAll();
  }

  /** Proformas eliminadas (papelera) */
  @Get('trash')
  findTrash(): Promise<Proforma[]> {
    return this.proformasService.findTrash();
  }

  /** Elimina permanentemente una proforma en la papelera (una a la vez) */
  @Delete('trash/:id')
  permanentRemove(@Param('id') id: string): Promise<void> {
    return this.proformasService.permanentRemove(id);
  }

  /**
   * Sugiere el siguiente ID secuencial basado en el último registro guardado.
   * Ejemplo de respuesta: { "suggestedId": "CM-PROF-86" }
   */
  @Get('next-id')
  getNextId(): Promise<NextIdResponse> {
    return this.proformasService.getNextSuggestedId();
  }

  /** Sugerencias de notas usadas en proformas anteriores */
  @Get('notas/suggestions')
  getNotasSuggestions(@Query() query: NotasSuggestionsQueryDto): Promise<string[]> {
    return this.proformasService.getNotasSuggestions(query.q);
  }

  /**
   * Recibe lotes de proformas generadas offline en la PWA
   * y las inserta o actualiza resguardando integridad referencial.
   */
  @Post('sync')
  sync(@Body() dto: SyncProformasDto): Promise<SyncProformasResult> {
    return this.proformasService.syncBatch(dto.proformas);
  }

  /** Obtiene una proforma activa por su ID editable */
  @Get(':id')
  findOne(@Param('id') id: string): Promise<Proforma> {
    return this.proformasService.findOne(id);
  }

  /**
   * Crea una proforma recalculando totales en servidor.
   * Acepta un idProforma manual ingresado por el usuario.
   */
  @Post()
  create(@Body() dto: CreateProformaDto): Promise<Proforma> {
    return this.proformasService.create(dto);
  }

  /**
   * Duplica cabecera y líneas de detalle con un nuevo ID sugerido,
   * retornando la copia lista para edición en estado DRAFT.
   */
  @Post(':id/clone')
  clone(@Param('id') id: string): Promise<Proforma> {
    return this.proformasService.clone(id);
  }

  /** Restaura una proforma desde la papelera */
  @Patch(':id/restore')
  restore(@Param('id') id: string): Promise<Proforma> {
    return this.proformasService.restore(id);
  }

  /** Actualiza una proforma en borrador recalculando totales si corresponde */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProformaDto,
  ): Promise<Proforma> {
    return this.proformasService.update(id, dto);
  }

  /** Envía la proforma a la papelera (eliminación lógica) */
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.proformasService.remove(id);
  }
}
