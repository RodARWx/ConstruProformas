import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateProformaDto } from './dto/create-proforma.dto';
import { NextIdResponse } from './dto/next-id-response.dto';
import { SyncProformasDto } from './dto/sync-proformas.dto';
import { SyncProformasResult } from './dto/sync-result.dto';
import { UpdateProformaDto } from './dto/update-proforma.dto';
import { Proforma } from './entities/proforma.entity';
import { ProformasService } from './proformas.service';

@Controller('proformas')
export class ProformasController {
  constructor(private readonly proformasService: ProformasService) {}

  /** Lista todas las proformas con sus relaciones */
  @Get()
  findAll(): Promise<Proforma[]> {
    return this.proformasService.findAll();
  }

  /**
   * Sugiere el siguiente ID secuencial basado en el último registro guardado.
   * Ejemplo de respuesta: { "suggestedId": "CM-PROF-86" }
   */
  @Get('next-id')
  getNextId(): Promise<NextIdResponse> {
    return this.proformasService.getNextSuggestedId();
  }

  /**
   * Recibe lotes de proformas generadas offline en la PWA
   * y las inserta o actualiza resguardando integridad referencial.
   */
  @Post('sync')
  sync(@Body() dto: SyncProformasDto): Promise<SyncProformasResult> {
    return this.proformasService.syncBatch(dto.proformas);
  }

  /** Obtiene una proforma por su ID editable */
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

  /** Actualiza una proforma en borrador recalculando totales si corresponde */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProformaDto,
  ): Promise<Proforma> {
    return this.proformasService.update(id, dto);
  }
}
