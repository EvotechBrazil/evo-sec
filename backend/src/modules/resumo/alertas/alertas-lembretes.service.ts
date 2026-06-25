import { Injectable } from '@nestjs/common';
import { Lembrete } from '@prisma/client';
import { LembretesService } from '../../lembretes/lembretes.service';
import { ResumoRepository } from '../resumo.repository';
import { fmtData, fmtHora, truncar } from '../format.util';
import { dentroQuietHours } from '../../../common/datas/quiet-hours.util';

const MAX_LEMBRETES = 2000;

/**
 * Disparo proativo de lembretes (SPEC-010): acha os lembretes vencidos, devolve
 * texto pronto p/ WhatsApp e (no LembretesService) marca/avança a recorrência.
 * Espelha o padrão dos alertas (SPEC-004) reusando ResumoRepository (tenant/opt-out)
 * + helpers tz-aware. Opt-out: Config `lembretes_ativo`. Respeita quiet hours do tenant
 * (suprime e NÃO muta — o lembrete dispara depois do silêncio).
 */
export interface AlertaLembretes {
  ativo: boolean;
  numero: string | null;
  temLembrete: boolean;
  dia: string;
  quiet: boolean;
  lembretes: { titulo: string; hora: string; recorrencia: string }[];
  texto: string;
}

@Injectable()
export class AlertaLembretesService {
  constructor(
    private readonly lembretes: LembretesService,
    private readonly repo: ResumoRepository,
  ) {}

  async gerar(dataIso?: string): Promise<AlertaLembretes> {
    const agora = dataIso ? new Date(`${dataIso}T12:00:00Z`) : new Date();
    const { timezone, whatsappNumber, quietHoursInicio, quietHoursFim } =
      await this.repo.tenantInfo();
    const ativo = await this.repo.flagAtiva('lembretes_ativo');

    const base = { numero: whatsappNumber, dia: fmtData(agora, timezone) };

    // Opt-out: não dispara nem muta.
    if (!ativo) {
      return { ativo: false, ...base, temLembrete: false, quiet: false, lembretes: [], texto: '' };
    }

    // Quiet hours: suprime e NÃO muta (os lembretes seguem pendentes p/ disparar depois).
    if (dentroQuietHours(agora, timezone, quietHoursInicio, quietHoursFim)) {
      return { ativo: true, ...base, temLembrete: false, quiet: true, lembretes: [], texto: '' };
    }

    const disparados = await this.lembretes.dispararPendentes(agora);
    const temLembrete = disparados.length > 0;

    return {
      ativo: true,
      ...base,
      temLembrete,
      quiet: false,
      lembretes: disparados.map((l) => ({
        titulo: l.titulo,
        hora: fmtHora(l.dataHora, timezone),
        recorrencia: l.recorrencia,
      })),
      texto: truncar(temLembrete ? this.montarTexto(agora, timezone, disparados) : '', MAX_LEMBRETES),
    };
  }

  private montarTexto(agora: Date, tz: string, lembretes: Lembrete[]): string {
    const L: string[] = [];
    L.push(`⏰ *Lembretes — ${fmtData(agora, tz)}*`);
    L.push('');
    const ordenados = [...lembretes].sort((a, b) => a.dataHora.getTime() - b.dataHora.getTime());
    for (const l of ordenados) {
      const recorrente = l.recorrencia !== 'NENHUMA' && l.recorrencia !== 'CUSTOM';
      const marca = recorrente ? ' 🔁' : '';
      const desc = l.descricao ? ` — ${l.descricao}` : '';
      L.push(`• ${fmtHora(l.dataHora, tz)} — ${l.titulo}${desc}${marca}`);
    }
    return L.join('\n');
  }
}
