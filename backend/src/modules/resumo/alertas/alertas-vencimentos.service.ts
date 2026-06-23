import { Injectable } from '@nestjs/common';
import { Conta, ContaTipo } from '@prisma/client';
import { FinanceiroService } from '../../financeiro/financeiro.service';
import { ResumoRepository } from '../resumo.repository';
import { fmtData, fmtMoeda, limitesDoDia, truncar } from '../format.util';

const MAX_VENCIMENTOS = 2000;
const DIAS_JANELA = 7;

/**
 * Alerta proativo de vencimentos (SPEC-004 §3.1): contas a pagar/receber
 * atrasadas, que vencem hoje ou nos próximos dias. Texto pronto p/ WhatsApp.
 * Reusa FinanceiroService.vencimentos() + ResumoRepository (tenant/opt-out)
 * + helpers de format.util. Opt-out: Config `alerta_vencimentos_ativo`.
 */
export interface AlertaVencimentos {
  ativo: boolean;
  numero: string | null;
  temAlerta: boolean;
  dia: string;
  resumo: {
    atrasadas: number;
    venceHoje: number;
    proximos: number;
    // Totais somam A_PAGAR + A_RECEBER juntos (visão de exposição do dia/atraso).
    totalAtrasadoCentavos: number;
    totalVenceHojeCentavos: number;
  };
  texto: string;
}

/** Conta categorizada e separada por tipo (você paga vs você recebe). */
interface Grupo {
  aPagar: Conta[];
  aReceber: Conta[];
}

const grupoVazio = (): Grupo => ({ aPagar: [], aReceber: [] });

@Injectable()
export class AlertaVencimentosService {
  constructor(
    private readonly financeiro: FinanceiroService,
    private readonly repo: ResumoRepository,
  ) {}

  async gerar(dataIso?: string): Promise<AlertaVencimentos> {
    const agora = dataIso ? new Date(`${dataIso}T12:00:00Z`) : new Date();
    const { timezone, whatsappNumber } = await this.repo.tenantInfo();
    const ativo = await this.repo.flagAtiva('alerta_vencimentos_ativo');

    if (!ativo) {
      return {
        ativo: false,
        numero: whatsappNumber,
        temAlerta: false,
        dia: fmtData(agora, timezone),
        resumo: {
          atrasadas: 0,
          venceHoje: 0,
          proximos: 0,
          totalAtrasadoCentavos: 0,
          totalVenceHojeCentavos: 0,
        },
        texto: '',
      };
    }

    const contas = await this.financeiro.vencimentos(DIAS_JANELA);
    const { inicio, fim } = limitesDoDia(agora, timezone);

    // Categoriza on-read pela borda do dia (tz do tenant) e separa por tipo.
    const atrasadas = grupoVazio();
    const venceHoje = grupoVazio();
    const proximos = grupoVazio();

    for (const c of contas) {
      const venc = c.vencimento;
      const balde = venc < inicio ? atrasadas : venc < fim ? venceHoje : proximos;
      if (c.tipo === ContaTipo.A_RECEBER) balde.aReceber.push(c);
      else balde.aPagar.push(c);
    }

    const nAtrasadas = atrasadas.aPagar.length + atrasadas.aReceber.length;
    const nVenceHoje = venceHoje.aPagar.length + venceHoje.aReceber.length;
    const nProximos = proximos.aPagar.length + proximos.aReceber.length;
    const temAlerta = nAtrasadas + nVenceHoje > 0;

    const totalAtrasadoCentavos = somaGrupo(atrasadas);
    const totalVenceHojeCentavos = somaGrupo(venceHoje);

    const texto = temAlerta
      ? this.montarTexto(agora, timezone, atrasadas, venceHoje, proximos)
      : '';

    return {
      ativo: true,
      numero: whatsappNumber,
      temAlerta,
      dia: fmtData(agora, timezone),
      resumo: {
        atrasadas: nAtrasadas,
        venceHoje: nVenceHoje,
        proximos: nProximos,
        totalAtrasadoCentavos,
        totalVenceHojeCentavos,
      },
      texto: truncar(texto, MAX_VENCIMENTOS),
    };
  }

  private montarTexto(
    agora: Date,
    tz: string,
    atrasadas: Grupo,
    venceHoje: Grupo,
    proximos: Grupo,
  ): string {
    const L: string[] = [];
    L.push(`💸 *Vencimentos — ${fmtData(agora, tz)}*`);

    const nAtrasadas = atrasadas.aPagar.length + atrasadas.aReceber.length;
    if (nAtrasadas) {
      L.push('');
      L.push(`🔴 *Atrasadas (${nAtrasadas})*`);
      this.secaoTipo(L, tz, atrasadas, 'venceu');
    }

    const nVenceHoje = venceHoje.aPagar.length + venceHoje.aReceber.length;
    if (nVenceHoje) {
      L.push('');
      L.push(`🟡 *Vencem hoje (${nVenceHoje})*`);
      this.secaoTipo(L, tz, venceHoje, 'vence');
    }

    const nProximos = proximos.aPagar.length + proximos.aReceber.length;
    if (nProximos) {
      L.push('');
      L.push(`🟢 *Próximos ${DIAS_JANELA} dias (${nProximos})*`);
      this.secaoTipo(L, tz, proximos, 'vence');
    }

    return L.join('\n');
  }

  /** Imprime "A pagar" e "A receber" (só se houver), cada um ordenado por vencimento asc. */
  private secaoTipo(L: string[], tz: string, g: Grupo, verbo: 'venceu' | 'vence'): void {
    const temAmbos = g.aPagar.length > 0 && g.aReceber.length > 0;
    if (g.aPagar.length) {
      if (temAmbos) L.push('_A pagar:_');
      for (const c of ordenar(g.aPagar)) L.push(this.linha(c, tz, verbo));
    }
    if (g.aReceber.length) {
      if (temAmbos) L.push('_A receber:_');
      for (const c of ordenar(g.aReceber)) L.push(this.linha(c, tz, verbo));
    }
  }

  private linha(c: Conta, tz: string, verbo: 'venceu' | 'vence'): string {
    return `• ${c.descricao} — ${verbo} ${fmtData(c.vencimento, tz)} — ${fmtMoeda(c.valorCentavos)}`;
  }
}

function ordenar(contas: Conta[]): Conta[] {
  return [...contas].sort((a, b) => a.vencimento.getTime() - b.vencimento.getTime());
}

function somaGrupo(g: Grupo): number {
  return [...g.aPagar, ...g.aReceber].reduce((s, c) => s + c.valorCentavos, 0);
}
