import { Injectable } from '@nestjs/common';
import { CategoriaTipo, ContaTipo, Recorrencia } from '@prisma/client';
import { OpenRouterAdapter } from './openrouter.adapter';
import { ContextoService } from './contexto.service';
import { ElevenLabsAdapter, VozResultado } from './elevenlabs.adapter';
import { RecadosService } from '../recados/recados.service';
import { TarefasService } from '../tarefas/tarefas.service';
import { LembretesService } from '../lembretes/lembretes.service';
import { AgendaService } from '../agenda/agenda.service';
import { FinanceiroService } from '../financeiro/financeiro.service';
import { CategoriasService } from '../categorias/categorias.service';
import { FinancasService } from '../financas/financas.service';
import { CreateRecadoDto } from '../recados/dto/create-recado.dto';
import { CreateTarefaDto } from '../tarefas/dto/create-tarefa.dto';
import { CreateLembreteDto } from '../lembretes/dto/create-lembrete.dto';
import { CreateCompromissoDto } from '../agenda/dto/create-compromisso.dto';
import { CreateContaDto } from '../financeiro/dto/create-conta.dto';
import { CreateMetaDto } from '../financas/dto/create-meta.dto';
import { agoraSaoPaulo, ancorarDataBR } from '../../common/datas/datas-br.util';

export type ConfirmacaoEstilo = 'primario' | 'perigo' | 'neutro';

/** Opção de confirmação neutra (renderizada como botão no WhatsApp ou card no app). */
export interface ConfirmacaoOpcao {
  id: string;
  label: string;
  estilo: ConfirmacaoEstilo;
}

export interface Confirmacao {
  titulo: string;
  opcoes: ConfirmacaoOpcao[];
}

export interface PendingAction {
  tipo: 'pagar' | 'aportar' | 'cancelar' | 'registrar_mov' | 'criar_conta';
  ids?: string[];
  metaId?: string;
  valorCentavos?: number;
  nomes: string[];
  payload?: Record<string, unknown>;
}

export interface NinaReply {
  resposta: string;
  acao: string;
  pendente?: PendingAction | null;
  confirmacao?: Confirmacao | null;
}

const AFIRMA = /(^|\b)(sim|isso|pode|confirmo|confirmar|claro|ok|paga|pode pagar|positivo|afirmativo|baixa)(\b|$)/i;
const NEGA = /(^|\b)(n[aã]o|cancela|cancelar|deixa|depois|para|negativo)(\b|$)/i;
const ERA_RECADO = /\brecado\b/i;

const OPCAO_CONFIRMAR: ConfirmacaoOpcao = { id: 'confirmar', label: '✅ Confirmar', estilo: 'primario' };
const OPCAO_RECADO: ConfirmacaoOpcao = { id: 'recado', label: '🗒️ Era recado', estilo: 'neutro' };
const OPCAO_CANCELAR: ConfirmacaoOpcao = { id: 'cancelar', label: '❌ Cancelar', estilo: 'perigo' };

const str = (v: unknown): string | undefined => {
  const s = typeof v === 'string' ? v.trim() : v == null ? '' : String(v);
  return s ? s : undefined;
};
const cents = (v: unknown): number => Math.round(Number(v ?? 0)) || 0;
const reais = (c: number): string =>
  (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

@Injectable()
export class NinaService {
  constructor(
    private readonly llm: OpenRouterAdapter,
    private readonly contexto: ContextoService,
    private readonly recados: RecadosService,
    private readonly tarefas: TarefasService,
    private readonly lembretes: LembretesService,
    private readonly agenda: AgendaService,
    private readonly financeiro: FinanceiroService,
    private readonly categorias: CategoriasService,
    private readonly financas: FinancasService,
    private readonly voz: ElevenLabsAdapter,
  ) {}

  /** Gera áudio (TTS ElevenLabs) de um texto — mesma voz do WhatsApp, p/ a voz do app (`/falar`). */
  gerarVoz(texto: string): Promise<VozResultado> {
    return this.voz.tts(texto);
  }

  async processar(texto: string, pendente?: PendingAction | null): Promise<NinaReply> {
    // Confirmação de ação pendente (stateless: o cliente devolve `pendente` + o texto/botão clicado).
    if (pendente && pendente.tipo) {
      if (ERA_RECADO.test(texto)) return this.gravarComoRecado(pendente, texto);
      if (AFIRMA.test(texto)) return this.executar(pendente);
      if (NEGA.test(texto)) return { resposta: 'Ok, cancelei. Não fiz nada.', acao: 'cancelar_pendente', pendente: null };
      // não entendeu — segue interpretando normalmente, descartando o pendente.
    }

    // Hora SP-local com offset -03:00 (SPEC-007): evita o off-by-one que vinha de
    // passar UTC rotulado como America/Sao_Paulo (datas saíam um dia antes).
    const nowIso = agoraSaoPaulo();
    // Memória conversacional (SPEC-006): carrega o histórico da sessão ativa antes
    // do NLU (best-effort — se falhar, segue sem contexto em vez de quebrar).
    const historico = await this.contexto.historico().catch(() => []);
    const { acao, dados, resposta } = await this.llm.intent(texto, nowIso, historico);

    const reply = await this.executarNlu(acao, dados, resposta, texto);
    await this.registrarTurno(texto, reply.resposta);
    return reply;
  }

  /** Roteia a intenção do LLM para a ação correspondente (extraído de `processar`). */
  private async executarNlu(
    acao: string,
    dados: Record<string, unknown>,
    resposta: string,
    texto: string,
  ): Promise<NinaReply> {
    try {
      switch (acao) {
        case 'criar_recado':
          await this.recados.create({ conteudo: str(dados.conteudo) ?? texto, categoria: str(dados.categoria), remetente: 'Rodrigo' } as CreateRecadoDto);
          return { resposta, acao };
        case 'criar_tarefa':
          await this.tarefas.create({ titulo: str(dados.titulo) ?? texto, descricao: str(dados.descricao), prazo: ancorarDataBR(str(dados.prazo)) } as CreateTarefaDto);
          return { resposta, acao };
        case 'criar_lembrete': {
          const dataHora = ancorarDataBR(str(dados.dataHora));
          if (!dataHora) return { resposta: 'Pra quando te lembro?', acao: 'criar_lembrete', pendente: null };
          await this.lembretes.create({ titulo: str(dados.titulo) ?? texto, dataHora, descricao: str(dados.descricao), recorrencia: str(dados.recorrencia) as Recorrencia | undefined } as CreateLembreteDto);
          return { resposta, acao };
        }
        case 'registrar_movimentacao':
          return this.prepararMovimentacao(dados, texto);
        case 'criar_conta':
          return this.prepararCriarConta(dados, texto);
        case 'consultar_saldo':
          return this.responderSaldo();
        case 'consultar_contas':
          return this.responderContas(str(dados.tipo));
        case 'criar_agenda': {
          const inicio = ancorarDataBR(str(dados.inicio));
          if (!inicio) return { resposta: 'Que dia e horário do compromisso?', acao: 'criar_agenda', pendente: null };
          await this.agenda.create({ titulo: str(dados.titulo) ?? texto, inicio, fim: ancorarDataBR(str(dados.fim)), local: str(dados.local), descricao: str(dados.descricao) } as CreateCompromissoDto);
          return { resposta, acao };
        }
        case 'criar_meta':
          await this.financas.createMeta({ nome: str(dados.nome) ?? texto, valorAlvoCentavos: cents(dados.valorAlvoCentavos), prazo: ancorarDataBR(str(dados.prazo)), aporteMensalSugeridoCent: dados.aporteMensalSugeridoCent != null ? cents(dados.aporteMensalSugeridoCent) : undefined } as CreateMetaDto);
          return { resposta, acao };
        case 'pagar_conta':
          return this.prepararPagar(str(dados.busca) ?? str(dados.descricao) ?? texto);
        case 'aportar_meta':
          return this.prepararAportar(str(dados.busca) ?? str(dados.nome) ?? texto, cents(dados.valorCentavos));
        case 'cancelar_agenda':
          return this.prepararCancelar(str(dados.busca) ?? str(dados.titulo) ?? texto);
        default:
          return { resposta, acao: 'conversa' };
      }
    } catch (e) {
      return { resposta: 'Anotei aqui, mas tive um problema ao salvar. Pode repetir com mais detalhe?', acao };
    }
  }

  /** Persiste o par user/assistant na memória (SPEC-006), best-effort. */
  private async registrarTurno(texto: string, resposta: string): Promise<void> {
    try {
      await this.contexto.registrar('user', texto);
      await this.contexto.registrar('assistant', resposta);
    } catch {
      // memória é best-effort: nunca quebra a resposta da Nina.
    }
  }

  private confirmar(titulo: string, opcoes: ConfirmacaoOpcao[]): Confirmacao {
    return { titulo, opcoes };
  }

  private match(termo: string, alvo: string): boolean {
    const a = termo.toLowerCase().trim();
    const b = (alvo || '').toLowerCase();
    return Boolean(a) && (b.includes(a) || a.includes(b));
  }

  // ───────── Financeiro: movimentação avulsa (entrada/saída de caixa) ─────────
  private async prepararMovimentacao(dados: Record<string, unknown>, texto: string): Promise<NinaReply> {
    const isEntrada = (str(dados.tipo) ?? '').toUpperCase().startsWith('ENT');
    const tipoMov: 'ENTRADA' | 'SAIDA' = isEntrada ? 'ENTRADA' : 'SAIDA';
    const valor = cents(dados.valorCentavos ?? dados.valor);
    const descricao = str(dados.descricao) ?? texto;
    if (!valor) return { resposta: 'Qual o valor dessa movimentação?', acao: 'registrar_movimentacao', pendente: null };
    const cat = await this.categorias.resolverPorNome(
      str(dados.categoria) ?? descricao,
      isEntrada ? CategoriaTipo.RECEITA : CategoriaTipo.DESPESA,
    );
    const label = isEntrada ? 'Entrada' : 'Saída';
    return {
      resposta: `Entendi: ${label} de ${reais(valor)}${cat ? ` · ${cat.nome}` : ''} — ${descricao}. Confirmo?`,
      acao: 'registrar_movimentacao',
      pendente: { tipo: 'registrar_mov', nomes: [descricao], payload: { tipo: tipoMov, descricao, valorCentavos: valor, categoriaId: cat?.id ?? null } },
      confirmacao: this.confirmar('Registrar movimentação?', [OPCAO_CONFIRMAR, OPCAO_RECADO, OPCAO_CANCELAR]),
    };
  }

  // ───────── Financeiro: conta a pagar/receber (título com vencimento) ─────────
  private async prepararCriarConta(dados: Record<string, unknown>, texto: string): Promise<NinaReply> {
    const tipo = (str(dados.tipo) as ContaTipo) ?? ContaTipo.A_PAGAR;
    const valor = cents(dados.valorCentavos);
    const descricao = str(dados.descricao) ?? texto;
    if (!valor) return { resposta: 'Qual o valor da conta?', acao: 'criar_conta', pendente: null };
    const vencimento = ancorarDataBR(str(dados.vencimento));
    if (!vencimento) return { resposta: 'Pra quando é o vencimento?', acao: 'criar_conta', pendente: null };
    const cat = await this.categorias.resolverPorNome(
      str(dados.categoria) ?? descricao,
      tipo === ContaTipo.A_RECEBER ? CategoriaTipo.RECEITA : CategoriaTipo.DESPESA,
    );
    const label = tipo === ContaTipo.A_RECEBER ? 'A receber' : 'A pagar';
    const venc = new Date(vencimento).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    return {
      resposta: `Entendi: ${label} ${reais(valor)}${cat ? ` · ${cat.nome}` : ''} — ${descricao} (vence ${venc}). Confirmo?`,
      acao: 'criar_conta',
      pendente: {
        tipo: 'criar_conta',
        nomes: [descricao],
        payload: { tipo, descricao, valorCentavos: valor, vencimento, categoriaId: cat?.id ?? null, contraparte: str(dados.contraparte) ?? null },
      },
      confirmacao: this.confirmar('Criar conta?', [OPCAO_CONFIRMAR, OPCAO_RECADO, OPCAO_CANCELAR]),
    };
  }

  // ───────── Financeiro: consultas (leitura, sem confirmação) ─────────
  private async responderSaldo(): Promise<NinaReply> {
    const r = await this.financeiro.resumo();
    const linhas = [
      `💰 Saldo do mês: ${reais(r.saldoCentavos)}`,
      `↗️ Entrou ${reais(r.entradasCentavos)}  ·  ↘️ Saiu ${reais(r.saidasCentavos)}`,
    ];
    if (r.aReceberPendenteCentavos) linhas.push(`📥 A receber em aberto: ${reais(r.aReceberPendenteCentavos)}`);
    if (r.aPagarPendenteCentavos) linhas.push(`📤 A pagar em aberto: ${reais(r.aPagarPendenteCentavos)}`);
    return { resposta: linhas.join('\n'), acao: 'consultar_saldo', pendente: null };
  }

  private async responderContas(tipoStrRaw?: string): Promise<NinaReply> {
    const tipoStr = (tipoStrRaw ?? '').toUpperCase();
    const tipo = tipoStr.includes('RECEB') ? ContaTipo.A_RECEBER : tipoStr.includes('PAG') ? ContaTipo.A_PAGAR : undefined;
    const contas = await this.financeiro.pendentes(tipo);
    if (!contas.length) return { resposta: 'Você não tem contas em aberto. 🎉', acao: 'consultar_contas', pendente: null };
    const total = contas.reduce((s, c) => s + (c.valorCentavos || 0), 0);
    const linhas = contas.slice(0, 10).map((c) => {
      const t = c.tipo === ContaTipo.A_RECEBER ? '📥' : '📤';
      const venc = new Date(c.vencimento).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      return `${t} ${reais(c.valorCentavos)} — ${c.descricao} (vence ${venc})`;
    });
    return { resposta: `Contas em aberto (${reais(total)}):\n${linhas.join('\n')}`, acao: 'consultar_contas', pendente: null };
  }

  // ───────── Ações que pedem confirmação sim/não ─────────
  private async prepararPagar(busca: string): Promise<NinaReply> {
    const todas = await this.financeiro.list();
    const pend = todas.filter((c) => c.status !== 'PAGO' && c.status !== 'RECEBIDO');
    let matches = pend.filter((c) => this.match(busca, c.descricao));
    if (!matches.length && pend.length === 1) matches = pend;
    if (!matches.length) return { resposta: 'Não achei conta pendente que bata com isso. Pode dizer o nome exato?', acao: 'pagar_conta', pendente: null };
    const total = matches.reduce((s, c) => s + (c.valorCentavos || 0), 0);
    const nomes = matches.map((c) => c.descricao);
    const varias = matches.length > 1;
    return {
      resposta: varias
        ? `Achei ${matches.length} contas (${reais(total)}): ${nomes.join(', ')}. Dar baixa em todas?`
        : `Encontrei: ${nomes[0]} (${reais(total)}). Dar baixa?`,
      acao: 'pagar_conta',
      pendente: { tipo: 'pagar', ids: matches.map((c) => c.id), nomes },
      confirmacao: this.confirmar('Dar baixa?', [
        { id: 'confirmar', label: '✅ Sim, dar baixa', estilo: 'primario' },
        { id: 'cancelar', label: '❌ Não', estilo: 'perigo' },
      ]),
    };
  }

  private async prepararAportar(busca: string, valor: number): Promise<NinaReply> {
    const metas = await this.financas.listMetas();
    let meta = metas.find((m) => this.match(busca, m.nome));
    if (!meta && metas.length === 1) meta = metas[0];
    if (!meta) return { resposta: 'Não achei essa meta. Qual o nome dela?', acao: 'aportar_meta', pendente: null };
    if (!valor) return { resposta: `Quanto você quer aportar na meta "${meta.nome}"?`, acao: 'aportar_meta', pendente: null };
    return {
      resposta: `Aportar ${reais(valor)} na meta "${meta.nome}"?`,
      acao: 'aportar_meta',
      pendente: { tipo: 'aportar', metaId: meta.id, valorCentavos: valor, nomes: [meta.nome] },
      confirmacao: this.confirmar('Aportar na meta?', [OPCAO_CONFIRMAR, { id: 'cancelar', label: '❌ Não', estilo: 'perigo' }]),
    };
  }

  private async prepararCancelar(busca: string): Promise<NinaReply> {
    const todos = await this.agenda.list();
    const ativos = todos.filter((c) => c.status !== 'CANCELADO');
    let matches = ativos.filter((c) => this.match(busca, c.titulo));
    if (!matches.length && ativos.length === 1) matches = ativos;
    if (!matches.length) return { resposta: 'Não achei compromisso que bata com isso. Qual o título?', acao: 'cancelar_agenda', pendente: null };
    const nomes = matches.map((c) => c.titulo);
    return {
      resposta: `Cancelar ${matches.length} compromisso(s): ${nomes.join(', ')}?`,
      acao: 'cancelar_agenda',
      pendente: { tipo: 'cancelar', ids: matches.map((c) => c.id), nomes },
      confirmacao: this.confirmar('Cancelar compromisso?', [{ id: 'confirmar', label: '✅ Sim, cancelar', estilo: 'perigo' }, { id: 'cancelar', label: '↩️ Manter', estilo: 'neutro' }]),
    };
  }

  // ───────── Execução pós-confirmação ─────────
  private async gravarComoRecado(pa: PendingAction, texto: string): Promise<NinaReply> {
    const conteudo = str(pa.payload?.descricao) ?? pa.nomes[0] ?? texto;
    try {
      await this.recados.create({ conteudo, remetente: 'Rodrigo' } as CreateRecadoDto);
      return { resposta: `Ok, guardei como recado: "${conteudo}".`, acao: 'criar_recado', pendente: null };
    } catch {
      return { resposta: 'Tentei guardar como recado, mas tive um problema.', acao: 'criar_recado', pendente: null };
    }
  }

  private async executar(pa: PendingAction): Promise<NinaReply> {
    try {
      if (pa.tipo === 'registrar_mov' && pa.payload) {
        const p = pa.payload;
        const tipoMov: 'ENTRADA' | 'SAIDA' = p.tipo === 'ENTRADA' ? 'ENTRADA' : 'SAIDA';
        const valor = Number(p.valorCentavos) || 0;
        await this.financeiro.registrarMovimentacao({
          tipo: tipoMov,
          descricao: String(p.descricao ?? ''),
          valorCentavos: valor,
          categoriaId: typeof p.categoriaId === 'string' ? p.categoriaId : undefined,
        });
        return { resposta: `Feito! ${tipoMov === 'ENTRADA' ? 'Entrada' : 'Saída'} de ${reais(valor)} registrada. ✅`, acao: 'confirmar', pendente: null };
      }
      if (pa.tipo === 'criar_conta' && pa.payload) {
        const p = pa.payload;
        await this.financeiro.create({
          tipo: p.tipo === 'A_RECEBER' ? ContaTipo.A_RECEBER : ContaTipo.A_PAGAR,
          descricao: String(p.descricao ?? ''),
          valorCentavos: Number(p.valorCentavos) || 0,
          vencimento: String(p.vencimento ?? agoraSaoPaulo()),
          categoriaId: typeof p.categoriaId === 'string' ? p.categoriaId : undefined,
          contraparte: typeof p.contraparte === 'string' ? p.contraparte : undefined,
        } as CreateContaDto);
        return { resposta: `Feito! Conta "${String(p.descricao ?? '')}" criada. ✅`, acao: 'confirmar', pendente: null };
      }
      if (pa.tipo === 'pagar') {
        for (const id of pa.ids ?? []) await this.financeiro.marcarQuitada(id);
        return { resposta: `Feito! Dei baixa em ${pa.ids?.length ?? 0} conta(s): ${pa.nomes.join(', ')}. ✅`, acao: 'confirmar', pendente: null };
      }
      if (pa.tipo === 'cancelar') {
        for (const id of pa.ids ?? []) await this.agenda.cancelar(id);
        return { resposta: `Feito! Cancelei ${pa.ids?.length ?? 0} compromisso(s): ${pa.nomes.join(', ')}.`, acao: 'confirmar', pendente: null };
      }
      if (pa.tipo === 'aportar' && pa.metaId) {
        await this.financas.aportar(pa.metaId, pa.valorCentavos ?? 0);
        return { resposta: `Feito! Aportei ${reais(pa.valorCentavos ?? 0)} na meta "${pa.nomes[0] ?? ''}".`, acao: 'confirmar', pendente: null };
      }
    } catch {
      return { resposta: 'Tive um problema ao executar. Pode tentar de novo?', acao: 'confirmar', pendente: null };
    }
    return { resposta: 'Não havia nada pendente pra confirmar.', acao: 'confirmar', pendente: null };
  }
}
