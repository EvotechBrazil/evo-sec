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
  Query,
} from '@nestjs/common';
import { Tarefa, TarefaTipo } from '@prisma/client';
import { TarefasService } from './tarefas.service';
import { CreateTarefaDto } from './dto/create-tarefa.dto';
import { UpdateTarefaDto } from './dto/update-tarefa.dto';

@Controller('tarefas')
export class TarefasController {
  constructor(private readonly tarefas: TarefasService) {}

  @Post()
  create(@Body() dto: CreateTarefaDto): Promise<Tarefa> {
    return this.tarefas.create(dto);
  }

  @Get()
  list(@Query('tipo') tipo?: TarefaTipo): Promise<Tarefa[]> {
    return this.tarefas.list(tipo);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<Tarefa> {
    return this.tarefas.get(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTarefaDto,
  ): Promise<Tarefa> {
    return this.tarefas.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.tarefas.remove(id);
  }
}
