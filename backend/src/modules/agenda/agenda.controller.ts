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
import { Compromisso } from '@prisma/client';
import { AgendaService, Disponibilidade } from './agenda.service';
import { CreateCompromissoDto } from './dto/create-compromisso.dto';
import { UpdateCompromissoDto } from './dto/update-compromisso.dto';

@Controller('agenda')
export class AgendaController {
  constructor(private readonly agenda: AgendaService) {}

  @Post()
  create(@Body() dto: CreateCompromissoDto): Promise<Compromisso> {
    return this.agenda.create(dto);
  }

  @Get()
  list(
    @Query('inicio') inicio?: string,
    @Query('fim') fim?: string,
  ): Promise<Compromisso[]> {
    return this.agenda.list(inicio, fim);
  }

  @Get('disponibilidade')
  checarDisponibilidade(
    @Query('inicio') inicio: string,
    @Query('fim') fim?: string,
  ): Promise<Disponibilidade> {
    return this.agenda.checarDisponibilidade(inicio, fim);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<Compromisso> {
    return this.agenda.get(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompromissoDto,
  ): Promise<Compromisso> {
    return this.agenda.update(id, dto);
  }

  @Post(':id/cancelar')
  cancelar(@Param('id', ParseUUIDPipe) id: string): Promise<Compromisso> {
    return this.agenda.cancelar(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.agenda.remove(id);
  }
}
