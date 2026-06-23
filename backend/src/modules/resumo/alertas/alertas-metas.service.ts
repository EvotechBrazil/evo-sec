import { Injectable } from '@nestjs/common';
import { MetaStatus } from '@prisma/client';
import { FinancasService, MetaEvolucao } from '../../financas/financas.service';
import { ResumoRepository } from '../resumo.repository';
import { fmtData, fmtMoeda, truncar } from '../format.util';

/**
 * Alerta proativo de aporte / meta atrasada (SPEC-004 §3.2): lembra de aportar
 * e avisa metas atrás do ritmo. COACH EDUCATIVO — o `texto` SEMPRE inclui o
 * disclaimer (não é recomendação regulada). Reusa FinancasService.evolucao()
 * (já traz atrasada/progressoPct/disclaimer) + ResumoRepository (tenant/opt-out).
 * Opt-out: Config `alerta_aportes_ativo`.
 */
export interface AlertaMetas {
  ativo: boolean;
  numero: string | null;
  temAlerta: boolean;
  dia: string;
  resumo: {
    metasAtrasadas: number;
    aportesSugeridos: number;
    totalAporteSugeridoCentavos: number;
  };
  texto: string;
}

const MAX_TEXTO = 2000;

/** Meta com o valor de aporte sugerido já resolvido (do banco ou calculado). */
interface AporteSugerido {
  meta: MetaEvolucao;
  valorCentavos: number;
}

@Injectable()
export class AlertaMetasService {
  constructor(
    private readonly financas: FinancasService,
    private readonly repo: ResumoRepository,
  ) {}

  async gerar(dataIso?: string): Promise<AlertaMetas> {
    const { timezone, whatsappNumber } = await this.repo.tenantInfo();
    const ativo = await this.repo.flagAtiva('alerta_aportes_ativo');
    const agora = dataIso ? new Date(`${dataIso}T12:00:00Z`) : new Date();

    // Opt-out: nem consulta a evolução — alerta é ruído quando desligado.
    if (!ativo) {
      return {
        ativo: false,
        numero: whatsappNumber,
        temAlerta: false,
        dia: fmtData(agora, timezone),
        resumo: { metasAtrasadas: 0, aportesSugeridos: 0, totalAporteSugeridoCentavos: 0 },
        texto: '',
      };
    }

    const ev = await this.financas.evolucao();

    const metasAtrasadas = ev.metas.filter((m) => m.atrasada);

    const aportesSugeridos: AporteSugerido[] = [];
    for (const meta of ev.metas) {
      if (meta.status !== MetaStatus.ATIVA || meta.progressoPct >= 100) continue;
      const valorCentavos = this.aporteSugeridoCentavos(meta, agora);
      if (valorCentavos === null) continue; // sem prazo e sem sugestão → não dá pra estimar
      aportesSugeridos.push({ meta, valorCentavos });
    }

    const totalAporteSugeridoCentavos = aportesSugeridos.reduce(
      (s, a) => s + a.valorCentavos,
      0,
    );
    const temAlerta = metasAtrasadas.length > 0 || aportesSugeridos.length > 0;

    const texto = truncar(
      this.texto(agora, timezone, metasAtrasadas, aportesSugeridos, ev.disclaimer),
      MAX_TEXTO,
    );

    return {
      ativo: true,
      numero: whatsappNumber,
      temAlerta,
      dia: fmtData(agora, timezone),
      resumo: {
        metasAtrasadas: metasAtrasadas.length,
        aportesSugeridos: aportesSugeridos.length,
        totalAporteSugeridoCentavos,
      },
      texto,
    };
  }

  /**
   * Aporte sugerido (centavos) para a meta: usa `aporteMensalSugeridoCent` do
   * banco quando houver; senão, se houver `prazo`, rateia o que falta pelos
   * meses restantes. Retorna `null` quando não há base para estimar.
   */
  private aporteSugeridoCentavos(meta: MetaEvolucao, agora: Date): number | null {
    if (meta.aporteMensalSugeridoCent != null) {
      return meta.aporteMensalSugeridoCent;
    }
    if (!meta.prazo) return null;

    const faltaCentavos = meta.valorAlvoCentavos - meta.valorAtualCentavos;
    if (faltaCentavos <= 0) return 0;

    const mesesRestantes = Math.max(1, this.mesesEntre(agora, meta.prazo));
    return Math.max(0, Math.ceil(faltaCentavos / mesesRestantes));
  }

  /** Meses (arredondados) entre `de` e `ate`; mínimo conceitual de 0. */
  private mesesEntre(de: Date, ate: Date): number {
    const MS_MES = 30 * 86_400_000;
    return Math.max(0, Math.round((ate.getTime() - de.getTime()) / MS_MES));
  }

  /**
   * Texto pronto p/ WhatsApp. Linguagem SUGESTIVA (nunca "invista X" imperativo)
   * e SEMPRE termina com o disclaimer em itálico — guardrail do coach (SPEC-004).
   */
  private texto(
    agora: Date,
    tz: string,
    metasAtrasadas: MetaEvolucao[],
    aportesSugeridos: AporteSugerido[],
    disclaimer: string,
  ): string {
    const L: string[] = [];
    L.push(`🎯 *Suas metas — ${fmtData(agora, tz)}*`);

    if (metasAtrasadas.length) {
      L.push('');
      L.push(`⚠️ *Atrás do ritmo (${metasAtrasadas.length})*`);
      for (const m of metasAtrasadas.slice(0, 8)) {
        const ritmo = m.prazo ? ` · prazo ${fmtData(m.prazo, tz)}` : '';
        L.push(`• ${m.nome} — ${m.progressoPct}% atingido${ritmo}`);
      }
    }

    if (aportesSugeridos.length) {
      L.push('');
      L.push('💡 *Que tal um aporte este mês?*');
      for (const a of aportesSugeridos.slice(0, 8)) {
        L.push(`• ${a.meta.nome} — algo perto de ${fmtMoeda(a.valorCentavos)} te deixaria no ritmo`);
      }
    }

    if (!metasAtrasadas.length && !aportesSugeridos.length) {
      L.push('');
      L.push('✨ Suas metas estão no ritmo — siga firme!');
    }

    // Guardrail inviolável: disclaimer educativo SEMPRE no fim, em itálico.
    L.push('');
    L.push(`_${disclaimer}_`);

    return L.map((l) => l.replace(/[ \t]+$/, '')).join('\n');
  }
}
