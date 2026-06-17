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
import { Conta, ContaStatus, ContaTipo } from '@prisma/client';
import { FinanceiroService, FluxoCaixa } from './financeiro.service';
import { CreateContaDto } from './dto/create-conta.dto';
import { UpdateContaDto } from './dto/update-conta.dto';

@Controller('financeiro')
export class FinanceiroController {
  constructor(private readonly financeiro: FinanceiroService) {}

  @Post('contas')
  create(@Body() dto: CreateContaDto): Promise<Conta> {
    return this.financeiro.create(dto);
  }

  @Get('contas')
  list(
    @Query('tipo') tipo?: ContaTipo,
    @Query('status') status?: ContaStatus,
  ): Promise<Conta[]> {
    return this.financeiro.list(tipo, status);
  }

  @Get('fluxo')
  fluxo(
    @Query('inicio') inicio?: string,
    @Query('fim') fim?: string,
  ): Promise<FluxoCaixa> {
    return this.financeiro.fluxoCaixa(inicio, fim);
  }

  @Get('vencimentos')
  vencimentos(@Query('dias') dias?: string): Promise<Conta[]> {
    return this.financeiro.vencimentos(dias ? Number(dias) : undefined);
  }

  @Get('contas/:id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<Conta> {
    return this.financeiro.get(id);
  }

  @Patch('contas/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContaDto,
  ): Promise<Conta> {
    return this.financeiro.update(id, dto);
  }

  @Post('contas/:id/pagar')
  marcarQuitada(@Param('id', ParseUUIDPipe) id: string): Promise<Conta> {
    return this.financeiro.marcarQuitada(id);
  }

  @Delete('contas/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.financeiro.remove(id);
  }
}
