import { Controller, Get, Query } from '@nestjs/common';
import { DigestDiario, DigestSemanal, ResumoService } from './resumo.service';

/**
 * Digests proativos da Nina (SPEC-002). Tenant-scoped (JWT ou
 * x-service-token + x-tenant-id). Retorna estrutura + texto pronto p/ WhatsApp.
 * Consumido pelo workflow n8n agendado (diário 7h45 seg-sex, semanal sexta 17h).
 */
@Controller('resumo')
export class ResumoController {
  constructor(private readonly resumo: ResumoService) {}

  @Get('diario')
  diario(@Query('data') data?: string): Promise<DigestDiario> {
    return this.resumo.diario(data);
  }

  @Get('semanal')
  semanal(
    @Query('inicio') inicio?: string,
    @Query('fim') fim?: string,
  ): Promise<DigestSemanal> {
    return this.resumo.semanal(inicio, fim);
  }
}
