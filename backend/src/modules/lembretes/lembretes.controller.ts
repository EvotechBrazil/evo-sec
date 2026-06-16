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
import { Lembrete } from '@prisma/client';
import { LembretesService } from './lembretes.service';
import { CreateLembreteDto } from './dto/create-lembrete.dto';
import { UpdateLembreteDto } from './dto/update-lembrete.dto';

@Controller('lembretes')
export class LembretesController {
  constructor(private readonly lembretes: LembretesService) {}

  @Post()
  create(@Body() dto: CreateLembreteDto): Promise<Lembrete> {
    return this.lembretes.create(dto);
  }

  @Get()
  list(): Promise<Lembrete[]> {
    return this.lembretes.list();
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<Lembrete> {
    return this.lembretes.get(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLembreteDto,
  ): Promise<Lembrete> {
    return this.lembretes.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.lembretes.remove(id);
  }
}
