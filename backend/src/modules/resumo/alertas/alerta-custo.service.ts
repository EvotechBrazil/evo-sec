import { Injectable } from '@nestjs/common';
import { CustoService } from '../../custo/custo.service';
import { ResumoRepository } from '../resumo.repository';
import { fmtData } from '../format.util';

/**
 * Teto de gasto diário com LLM, em microdólares (US$5,00/dia).
 * Hoje é constante; no futuro pode virar Config por tenant
 * (`custo_teto_micro_usd`) — ver SPEC-012 §2 (14D). Inteiro de micro-USD
 * (mesma unidade de `UsoLlm.custoMicroUsd`) — nunca float.
 */
const TETO_MICRO_USD_DIA = 5_000_000;

/**
 * Alerta proativo de custo LLM (SPEC-012 §2 — slice 14D): avisa quando o gasto
 * com modelos no período (default = hoje) ultrapassa o teto. Espelha o padrão
 * dos alertas proativos (SPEC-004): envelope com `texto` pronto p/ WhatsApp +
 * flag `temAlerta` (o n8n só envia quando há o que avisar). Reusa
 * `CustoService.resumo()` + `ResumoRepository` (tenant/opt-out).
 * Opt-out: Config `alerta_custo_ativo`. Valores em **US$** (não R$).
 */
export interface AlertaCusto {
  ativo: boolean;
  numero: string | null;
  temAlerta: boolean;
  custoMicroUsd: number;
  tetoMicroUsd: number;
  dia: string;
  texto: string;
}

@Injectable()
export class AlertaCustoService {
  constructor(
    private readonly custo: CustoService,
    private readonly repo: ResumoRepository,
  ) {}

  async gerar(dias = 1): Promise<AlertaCusto> {
    const { timezone, whatsappNumber } = await this.repo.tenantInfo();
    const ativo = await this.repo.flagAtiva('alerta_custo_ativo');
    const dia = fmtData(new Date(), timezone);

    if (!ativo) {
      return {
        ativo: false,
        numero: whatsappNumber,
        temAlerta: false,
        custoMicroUsd: 0,
        tetoMicroUsd: TETO_MICRO_USD_DIA,
        dia,
        texto: '',
      };
    }

    const resumo = await this.custo.resumo(dias);
    const custoMicroUsd = resumo.custoMicroUsd;
    const temAlerta = custoMicroUsd > TETO_MICRO_USD_DIA;

    return {
      ativo: true,
      numero: whatsappNumber,
      temAlerta,
      custoMicroUsd,
      tetoMicroUsd: TETO_MICRO_USD_DIA,
      dia,
      texto: temAlerta ? this.texto(custoMicroUsd, resumo.porModelo) : '',
    };
  }

  private texto(
    custoMicroUsd: number,
    porModelo: { modelo: string; custoMicroUsd: number }[],
  ): string {
    const L: string[] = [];
    L.push(
      `💸 *Custo LLM hoje: ${fmtUsd(custoMicroUsd)}* (teto ${fmtUsd(TETO_MICRO_USD_DIA)})`,
    );
    L.push('');
    L.push('Acima do teto diário. Top modelos:');
    for (const m of [...porModelo]
      .sort((a, b) => b.custoMicroUsd - a.custoMicroUsd)
      .slice(0, 5)) {
      L.push(`• ${m.modelo} — ${fmtUsd(m.custoMicroUsd)}`);
    }
    return L.join('\n');
  }
}

/** Microdólares (inteiro) → "US$ 5.00". Unidade financeira em US$, nunca R$. */
function fmtUsd(microUsd: number): string {
  return `US$ ${(microUsd / 1_000_000).toFixed(2)}`;
}
