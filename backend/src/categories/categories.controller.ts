import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(): Promise<Category[]> {
    return this.categoriesService.findAll();
  }

  @Get(':nombre')
  findOne(@Param('nombre') nombre: string): Promise<Category> {
    return this.categoriesService.findOne(decodeURIComponent(nombre));
  }

  @Post()
  create(@Body() dto: CreateCategoryDto): Promise<Category> {
    return this.categoriesService.create(dto);
  }

  @Patch(':nombre')
  update(
    @Param('nombre') nombre: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categoriesService.update(decodeURIComponent(nombre), dto);
  }

  @Delete(':nombre')
  remove(@Param('nombre') nombre: string): Promise<void> {
    return this.categoriesService.remove(decodeURIComponent(nombre));
  }
}
