import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Categoria } from '@prisma/client';
import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';

@Controller('categorias')
export class CategoriasController {
  constructor(private readonly categorias: CategoriasService) {}

  @Get()
  list(): Promise<Categoria[]> {
    return this.categorias.list();
  }

  @Post()
  create(@Body() dto: CreateCategoriaDto): Promise<Categoria> {
    return this.categorias.create(dto);
  }

  /** Garante o plano de contas base para o tenant (idempotente). */
  @Post('garantir-padrao')
  async garantirPadrao(): Promise<{ criadas: number }> {
    return { criadas: await this.categorias.garantirPadrao() };
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoriaDto,
  ): Promise<Categoria> {
    return this.categorias.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.categorias.remove(id);
  }
}
