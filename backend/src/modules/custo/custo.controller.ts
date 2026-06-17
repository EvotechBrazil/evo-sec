import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { UsoLlm } from '@prisma/client';
import { CustoService, ResumoCusto } from './custo.service';
import { CreateUsoDto } from './dto/create-uso.dto';

@Controller('usos-llm')
export class CustoController {
  constructor(private readonly custo: CustoService) {}

  @Post()
  registrar(@Body() dto: CreateUsoDto): Promise<UsoLlm> {
    return this.custo.registrar(dto);
  }

  @Get()
  listar(): Promise<UsoLlm[]> {
    return this.custo.listar();
  }

  @Get('resumo')
  resumo(@Query('dias') dias?: string): Promise<ResumoCusto> {
    return this.custo.resumo(dias ? Number(dias) : undefined);
  }
}
