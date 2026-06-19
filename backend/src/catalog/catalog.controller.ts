import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { ListCatalogQueryDto } from './dto/list-catalog-query.dto';
import { SearchCatalogQueryDto } from './dto/search-catalog-query.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';
import { ItemCatalog } from './entities/item-catalog.entity';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  findAll(@Query() query: ListCatalogQueryDto): Promise<ItemCatalog[]> {
    return this.catalogService.findAll(query.categoriaNombre);
  }

  /**
   * Autocompletado inteligente: GET /api/catalog/search?q=excav&limit=10
   * Usa coincidencia parcial (LIKE) sobre descripción y código sugerido.
   */
  @Get('search')
  search(@Query() query: SearchCatalogQueryDto): Promise<ItemCatalog[]> {
    return this.catalogService.searchByText(
      query.q,
      query.limit,
      query.categoriaNombre,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ItemCatalog> {
    return this.catalogService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCatalogItemDto): Promise<ItemCatalog> {
    return this.catalogService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCatalogItemDto,
  ): Promise<ItemCatalog> {
    return this.catalogService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.catalogService.remove(id);
  }
}
