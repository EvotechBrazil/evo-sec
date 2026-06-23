import { Injectable } from '@nestjs/common';
import { Tarefa, TarefaStatus, TarefaTipo } from '@prisma/client';
import { TarefasService } from '../../tarefas/tarefas.service';
import { ResumoRepository } from '../resumo.repository';
import { fmtData, limitesDoDia, truncar } from '../format.util';

const MAX_TEXTO = 2000;

/**
 * Alerta proativo de follow-up "aguardando" (SPEC-004 §3.3): cobra tarefas
 * tipo AGUARDANDO cuja dataCobranca chegou (verificação contínua do GTD).
 * Reusa TarefasService.list(AGUARDANDO) + ResumoRepository (tenant/opt-out)
 * + helpers de format.util. Opt-out: Config `alerta_aguardando_ativo`.
 */
export interface AlertaAguardando {
  ativo: boolean;
  numero: string | null;
  temAlerta: boolean;
  dia: string;
  resumo: {
    aCobrar: number;
  };
  texto: string;
}

@Injectable()
export class AlertaAguardandoService {
  constructor(
    private readonly tarefas: TarefasService,
    private readonly repo: ResumoRepository,
  ) {}

  async gerar(dataIso?: string): Promise<AlertaAguardando> {
    const { timezone, whatsappNumber } = await this.repo.tenantInfo();
    const ativo = await this.repo.flagAtiva('alerta_aguardando_ativo');
    const agora = dataIso ? new Date(`${dataIso}T12:00:00Z`) : new Date();
    const dia = fmtData(agora, timezone);

    if (!ativo) {
      return {
        ativo: false,
        numero: whatsappNumber,
        temAlerta: false,
        dia,
        resumo: { aCobrar: 0 },
        texto: '',
      };
    }

    const { fim } = limitesDoDia(agora, timezone);
    const tarefas = await this.tarefas.list(TarefaTipo.AGUARDANDO);

    const aCobrar = tarefas
      .filter(
        (t) =>
          t.status === TarefaStatus.PENDENTE &&
          t.dataCobranca != null &&
          t.dataCobranca.getTime() < fim.getTime(),
      )
      .sort((a, b) => a.dataCobranca!.getTime() - b.dataCobranca!.getTime());

    const temAlerta = aCobrar.length > 0;

    return {
      ativo: true,
      numero: whatsappNumber,
      temAlerta,
      dia,
      resumo: { aCobrar: aCobrar.length },
      texto: temAlerta ? this.texto(aCobrar, timezone) : '',
    };
  }

  private texto(itens: Tarefa[], tz: string): string {
    const L: string[] = [];
    L.push(`⏳ *Follow-ups pra cobrar (${itens.length})*`);
    for (const t of itens) {
      L.push(
        `• ${t.titulo} — aguardando ${t.aguardandoDe ?? '—'} — desde ${fmtData(t.dataCobranca!, tz)}`,
      );
    }
    return truncar(L.join('\n'), MAX_TEXTO);
  }
}
