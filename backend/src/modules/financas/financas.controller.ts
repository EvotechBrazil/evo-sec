import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Investimento, MetaFinanceira } from '@prisma/client';
import { Evolucao, FinancasService } from './financas.service';
import { CreateMetaDto } from './dto/create-meta.dto';
import { AportarDto } from './dto/aportar.dto';
import { CreateInvestimentoDto } from './dto/create-investimento.dto';

@Controller('financas')
export class FinancasController {
  constructor(private readonly financas: FinancasService) {}

  @Post('metas')
  createMeta(@Body() dto: CreateMetaDto): Promise<MetaFinanceira> {
    return this.financas.createMeta(dto);
  }

  @Get('metas')
  listMetas(): Promise<MetaFinanceira[]> {
    return this.financas.listMetas();
  }

  @Post('metas/:id/aportar')
  aportar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AportarDto,
  ): Promise<MetaFinanceira> {
    return this.financas.aportar(id, dto.valorCentavos, dto.idempotencyKey);
  }

  @Post('investimentos')
  createInvestimento(@Body() dto: CreateInvestimentoDto): Promise<Investimento> {
    return this.financas.createInvestimento(dto);
  }

  @Get('investimentos')
  listInvestimentos(): Promise<Investimento[]> {
    return this.financas.listInvestimentos();
  }

  @Get('evolucao')
  evolucao(): Promise<Evolucao> {
    return this.financas.evolucao();
  }
}
