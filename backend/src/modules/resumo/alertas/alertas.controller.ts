import { Controller, Get, Post, Query } from '@nestjs/common';
import { AlertaVencimentos, AlertaVencimentosService } from './alertas-vencimentos.service';
import { AlertaMetas, AlertaMetasService } from './alertas-metas.service';
import { AlertaAguardando, AlertaAguardandoService } from './alertas-aguardando.service';
import { AlertaLembretes, AlertaLembretesService } from './alertas-lembretes.service';

/**
 * Alertas proativos da Nina (SPEC-004). Tenant-scoped (JWT ou
 * x-service-token + x-tenant-id). Cada endpoint devolve estrutura + `texto`
 * pronto p/ WhatsApp e o flag `temAlerta` (o n8n só envia quando há o que avisar).
 * Consumidos por workflows n8n agendados (cron configurável — ver SPEC-004 §3).
 */
@Controller('resumo')
export class AlertasController {
  constructor(
    private readonly vencimentos: AlertaVencimentosService,
    private readonly metas: AlertaMetasService,
    private readonly aguardando: AlertaAguardandoService,
    private readonly lembretes: AlertaLembretesService,
  ) {}

  @Get('vencimentos')
  getVencimentos(@Query('data') data?: string): Promise<AlertaVencimentos> {
    return this.vencimentos.gerar(data);
  }

  /**
   * Disparo de lembretes (SPEC-010) — POST porque MUTA (marca notificado /
   * avança recorrência). Cron do n8n (cada ~15 min). `texto` pronto p/ WhatsApp;
   * `temLembrete` indica se há o que enviar (o n8n só envia quando true).
   */
  @Post('lembretes')
  dispararLembretes(@Query('data') data?: string): Promise<AlertaLembretes> {
    return this.lembretes.gerar(data);
  }

  @Get('aportes')
  getAportes(@Query('data') data?: string): Promise<AlertaMetas> {
    return this.metas.gerar(data);
  }

  @Get('follow-ups')
  getFollowUps(@Query('data') data?: string): Promise<AlertaAguardando> {
    return this.aguardando.gerar(data);
  }
}
