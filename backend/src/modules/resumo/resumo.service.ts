import { Injectable } from '@nestjs/common';
import {
  Compromisso,
  Conta,
  ContaStatus,
  Lembrete,
  LembreteStatus,
  Recado,
  RecadoStatus,
  Tarefa,
  TarefaStatus,
} from '@prisma/client';
import { RecadosService } from '../recados/recados.service';
import { TarefasService } from '../tarefas/tarefas.service';
import { LembretesService } from '../lembretes/lembretes.service';
import { AgendaService } from '../agenda/agenda.service';
import { FinanceiroService } from '../financeiro/financeiro.service';
import { ResumoRepository } from './resumo.repository';
import {
  fmtData,
  fmtHora,
  fmtMoeda,
  limitesDaSemana,
  limitesDoDia,
  seta,
  sparkline,
  truncar,
  variacaoPct,
} from './format.util';

const MAX_DIARIO = 2000;
const MAX_SEMANAL = 4000;
const DIAS_SIGLA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']; // dom..sáb

export interface DigestDiario {
  ativo: boolean;
  numero: string | null;
  dia: string;
  resumo: {
    venceHoje: { contas: number; tarefas: number; lembretes: number };
    atrasados: { contas: number; tarefas: number; lembretes: number };
    compromissos: number;
    vipsAguardando: number;
  };
  texto: string;
}

export interface DigestSemanal {
  ativo: boolean;
  numero: string | null;
  inicio: string;
  fim: string;
  resumo: {
    criados: number;
    concluidos: number;
    contasPagas: number;
    contasPagasCentavos: number;
    backlogPendente: number;
    backlogAtrasado: number;
  };
  texto: string;
}

@Injectable()
export class ResumoService {
  constructor(
    private readonly recados: RecadosService,
    private readonly tarefas: TarefasService,
    private readonly lembretes: LembretesService,
    private readonly agenda: AgendaService,
    private readonly financeiro: FinanceiroService,
    private readonly repo: ResumoRepository,
  ) {}

  // ───────────────────────────── Diário ─────────────────────────────

  async diario(dataIso?: string): Promise<DigestDiario> {
    const { timezone, whatsappNumber } = await this.repo.tenantInfo();
    const ativo = await this.repo.flagAtiva('digest_diario_ativo');
    const agora = dataIso ? new Date(`${dataIso}T12:00:00Z`) : new Date();
    const { inicio, fim } = limitesDoDia(agora, timezone);

    const [contas, tarefas, lembretes, compromissos, recados, vips] = await Promise.all([
      this.financeiro.list(),
      this.tarefas.list(),
      this.lembretes.list(),
      this.agenda.list(inicio.toISOString(), fim.toISOString()),
      this.recados.list(),
      this.repo.listVips(),
    ]);

    const contaAberta = (c: Conta) =>
      c.status === ContaStatus.PENDENTE || c.status === ContaStatus.ATRASADO;
    const tarefaAberta = (t: Tarefa) => t.status !== TarefaStatus.CONCLUIDO;
    const lembreteAberto = (l: Lembrete) => l.status === LembreteStatus.PENDENTE;
    const noDia = (d: Date) => d >= inicio && d < fim;
    const atrasado = (d: Date) => d < inicio;

    const venceHoje = {
      contas: contas.filter((c) => contaAberta(c) && noDia(c.vencimento)),
      tarefas: tarefas.filter((t) => tarefaAberta(t) && t.prazo && noDia(t.prazo)),
      lembretes: lembretes.filter((l) => lembreteAberto(l) && noDia(l.dataHora)),
    };
    const atrasados = {
      contas: contas.filter((c) => contaAberta(c) && atrasado(c.vencimento)),
      tarefas: tarefas.filter((t) => tarefaAberta(t) && t.prazo && atrasado(t.prazo)),
      lembretes: lembretes.filter((l) => lembreteAberto(l) && atrasado(l.dataHora)),
    };

    const vipNomes = vips.map((v) => v.nome.toLowerCase());
    const vipsAguardando = recados.filter(
      (r) =>
        r.status === RecadoStatus.PENDENTE &&
        r.remetente &&
        vipNomes.some((n) => r.remetente!.toLowerCase().includes(n)),
    );

    const texto = this.textoDiario(
      agora,
      timezone,
      venceHoje,
      atrasados,
      compromissos,
      vipsAguardando,
    );

    return {
      ativo,
      numero: whatsappNumber,
      dia: fmtData(agora, timezone),
      resumo: {
        venceHoje: {
          contas: venceHoje.contas.length,
          tarefas: venceHoje.tarefas.length,
          lembretes: venceHoje.lembretes.length,
        },
        atrasados: {
          contas: atrasados.contas.length,
          tarefas: atrasados.tarefas.length,
          lembretes: atrasados.lembretes.length,
        },
        compromissos: compromissos.length,
        vipsAguardando: vipsAguardando.length,
      },
      texto: truncar(texto, MAX_DIARIO),
    };
  }

  private textoDiario(
    agora: Date,
    tz: string,
    venceHoje: { contas: Conta[]; tarefas: Tarefa[]; lembretes: Lembrete[] },
    atrasados: { contas: Conta[]; tarefas: Tarefa[]; lembretes: Lembrete[] },
    compromissos: Compromisso[],
    vips: Recado[],
  ): string {
    const L: string[] = [];
    L.push(`☀️ *Bom dia! Resumo de ${fmtData(agora, tz)}*`);

    const ativos = compromissos.filter((c) => c.status !== 'CANCELADO');
    if (ativos.length) {
      L.push('');
      L.push('📅 *Hoje na agenda*');
      for (const c of ativos.slice(0, 8)) {
        const hora = c.diaInteiro ? 'dia inteiro' : fmtHora(c.inicio, tz);
        L.push(`• ${hora} — ${c.titulo}${c.local ? ` (${c.local})` : ''}`);
      }
    }

    const nAtras =
      atrasados.contas.length + atrasados.tarefas.length + atrasados.lembretes.length;
    if (nAtras) {
      L.push('');
      L.push(`⚠️ *Atrasado (${nAtras})*`);
      for (const c of atrasados.contas.slice(0, 6)) {
        L.push(`• 💰 ${c.descricao} — ${fmtMoeda(c.valorCentavos)} (venceu ${fmtData(c.vencimento, tz)})`);
      }
      for (const t of atrasados.tarefas.slice(0, 6)) {
        L.push(`• ✅ ${t.titulo} (prazo ${t.prazo ? fmtData(t.prazo, tz) : '—'})`);
      }
      for (const l of atrasados.lembretes.slice(0, 4)) {
        L.push(`• ⏰ ${l.titulo} (era ${fmtData(l.dataHora, tz)})`);
      }
    }

    const nHoje =
      venceHoje.contas.length + venceHoje.tarefas.length + venceHoje.lembretes.length;
    if (nHoje) {
      L.push('');
      L.push(`📌 *Vence hoje (${nHoje})*`);
      for (const c of venceHoje.contas) {
        L.push(`• 💰 ${c.descricao} — ${fmtMoeda(c.valorCentavos)}`);
      }
      for (const t of venceHoje.tarefas) {
        L.push(`• ✅ ${t.titulo}`);
      }
      for (const l of venceHoje.lembretes) {
        L.push(`• ⏰ ${fmtHora(l.dataHora, tz)} ${l.titulo}`);
      }
    }

    if (vips.length) {
      L.push('');
      L.push(`🌟 *VIPs aguardando (${vips.length})*`);
      for (const r of vips.slice(0, 6)) {
        L.push(`• ${r.remetente} — "${r.conteudo.slice(0, 60)}"`);
      }
    }

    if (ativos.length === 0 && nAtras === 0 && nHoje === 0 && vips.length === 0) {
      L.push('');
      L.push('✨ Tudo em dia — nenhuma pendência nem compromisso pra hoje. Bom dia!');
    }

    return L.join('\n');
  }

  // ───────────────────────────── Semanal ─────────────────────────────

  async semanal(inicioIso?: string, fimIso?: string): Promise<DigestSemanal> {
    const { timezone, whatsappNumber } = await this.repo.tenantInfo();
    const ativo = await this.repo.flagAtiva('digest_semanal_ativo');
    const agora = new Date();

    const janela =
      inicioIso && fimIso
        ? { inicio: new Date(inicioIso), fim: new Date(`${fimIso}T23:59:59Z`) }
        : limitesDaSemana(agora, timezone);
    const duracao = janela.fim.getTime() - janela.inicio.getTime();
    const anterior = {
      inicio: new Date(janela.inicio.getTime() - duracao),
      fim: janela.inicio,
    };

    const [contas, tarefas, lembretes, recados] = await Promise.all([
      this.financeiro.list(),
      this.tarefas.list(),
      this.lembretes.list(),
      this.recados.list(),
    ]);

    const noPeriodo = (d: Date, p: { inicio: Date; fim: Date }) =>
      d >= p.inicio && d < p.fim;

    const criadosEm = (p: { inicio: Date; fim: Date }) =>
      tarefas.filter((t) => noPeriodo(t.createdAt, p)).length +
      recados.filter((r) => noPeriodo(r.createdAt, p)).length +
      lembretes.filter((l) => noPeriodo(l.createdAt, p)).length;

    const concluidosEm = (p: { inicio: Date; fim: Date }) =>
      tarefas.filter((t) => t.status === TarefaStatus.CONCLUIDO && noPeriodo(t.updatedAt, p)).length +
      recados.filter((r) => r.status === RecadoStatus.RESOLVIDO && noPeriodo(r.updatedAt, p)).length;

    const pagasEm = (p: { inicio: Date; fim: Date }) =>
      contas.filter(
        (c) =>
          (c.status === ContaStatus.PAGO || c.status === ContaStatus.RECEBIDO) &&
          c.pagoEm &&
          noPeriodo(c.pagoEm, p),
      );

    const criados = criadosEm(janela);
    const criadosAnt = criadosEm(anterior);
    const concluidos = concluidosEm(janela);
    const concluidosAnt = concluidosEm(anterior);
    const pagas = pagasEm(janela);
    const pagasAnt = pagasEm(anterior);
    const pagasCentavos = pagas.reduce((s, c) => s + c.valorCentavos, 0);

    const backlogPendente = tarefas.filter((t) => t.status !== TarefaStatus.CONCLUIDO).length;
    const backlogAtrasado = tarefas.filter(
      (t) => t.status !== TarefaStatus.CONCLUIDO && t.prazo && t.prazo < janela.fim,
    ).length;

    // Curva diária de itens criados (7 baldes)
    const baldes = new Array(7).fill(0);
    const todos = [
      ...tarefas.map((t) => t.createdAt),
      ...recados.map((r) => r.createdAt),
      ...lembretes.map((l) => l.createdAt),
    ];
    for (const d of todos) {
      if (!noPeriodo(d, janela)) continue;
      const idx = Math.min(6, Math.floor((d.getTime() - janela.inicio.getTime()) / 86_400_000));
      baldes[idx]++;
    }
    const siglas = Array.from({ length: 7 }, (_, i) => {
      const dia = new Date(janela.inicio.getTime() + i * 86_400_000);
      return DIAS_SIGLA[dia.getUTCDay()];
    }).join('');

    const texto = this.textoSemanal(
      janela,
      timezone,
      { criados, criadosAnt, concluidos, concluidosAnt },
      { pagas: pagas.length, pagasAnt: pagasAnt.length, pagasCentavos },
      { backlogPendente, backlogAtrasado },
      sparkline(baldes),
      siglas,
    );

    return {
      ativo,
      numero: whatsappNumber,
      inicio: fmtData(janela.inicio, timezone),
      fim: fmtData(new Date(janela.fim.getTime() - 1), timezone),
      resumo: {
        criados,
        concluidos,
        contasPagas: pagas.length,
        contasPagasCentavos: pagasCentavos,
        backlogPendente,
        backlogAtrasado,
      },
      texto: truncar(texto, MAX_SEMANAL),
    };
  }

  private textoSemanal(
    janela: { inicio: Date; fim: Date },
    tz: string,
    fluxo: { criados: number; criadosAnt: number; concluidos: number; concluidosAnt: number },
    contas: { pagas: number; pagasAnt: number; pagasCentavos: number },
    backlog: { backlogPendente: number; backlogAtrasado: number },
    curva: string,
    siglas: string,
  ): string {
    const fimLabel = fmtData(new Date(janela.fim.getTime() - 1), tz);
    const L: string[] = [];
    L.push(`📊 *Resumo da semana — ${fmtData(janela.inicio, tz)} a ${fimLabel}*`);
    L.push('');

    L.push('*KPIs*');
    L.push(`• Itens criados:   ${fluxo.criados}  ${this.comparativo(fluxo.criados, fluxo.criadosAnt)}`);
    L.push(`• Concluídos:      ${fluxo.concluidos}  ${this.comparativo(fluxo.concluidos, fluxo.concluidosAnt)}`);
    L.push(`• Contas pagas:    ${contas.pagas} (${fmtMoeda(contas.pagasCentavos)})  ${this.comparativo(contas.pagas, contas.pagasAnt)}`);

    if (curva) {
      L.push('');
      L.push('*Curva de criação (semana)*');
      L.push(`  ${curva}`);
      L.push(`  ${siglas}`);
    }

    L.push('');
    L.push('*Backlog atual*');
    L.push(`• Tarefas pendentes: ${backlog.backlogPendente}`);
    L.push(`• Atrasadas:         ${backlog.backlogAtrasado} ${backlog.backlogAtrasado > 0 ? '⚠️' : '✅'}`);

    L.push('');
    if (fluxo.concluidos >= fluxo.criados && fluxo.criados > 0) {
      L.push('✨ Você concluiu mais do que entrou — backlog encolhendo. Bom ritmo!');
    } else if (backlog.backlogAtrasado > 0) {
      L.push('🎯 Foco da semana: zerar as tarefas atrasadas antes que acumulem.');
    } else {
      L.push('👍 Semana sob controle. Defina 1-2 prioridades pra próxima.');
    }

    // remove espaços sobrando no fim de cada linha (ex.: KPI sem comparativo)
    return L.map((l) => l.replace(/[ \t]+$/, '')).join('\n');
  }

  private comparativo(atual: number, anterior: number): string {
    const pct = variacaoPct(atual, anterior);
    if (pct === null) return '';
    return `(${pct >= 0 ? '+' : ''}${pct}% ${seta(pct)})`;
  }
}
