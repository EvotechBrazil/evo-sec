import { Injectable } from '@nestjs/common';
import { ContaTipo, Prioridade, Recorrencia } from '@prisma/client';
import { OpenRouterAdapter } from './openrouter.adapter';
import { RecadosService } from '../recados/recados.service';
import { TarefasService } from '../tarefas/tarefas.service';
import { LembretesService } from '../lembretes/lembretes.service';
import { AgendaService } from '../agenda/agenda.service';
import { FinanceiroService } from '../financeiro/financeiro.service';
import { FinancasService } from '../financas/financas.service';
import { CreateRecadoDto } from '../recados/dto/create-recado.dto';
import { CreateTarefaDto } from '../tarefas/dto/create-tarefa.dto';
import { CreateLembreteDto } from '../lembretes/dto/create-lembrete.dto';
import { CreateCompromissoDto } from '../agenda/dto/create-compromisso.dto';
import { CreateContaDto } from '../financeiro/dto/create-conta.dto';
import { CreateMetaDto } from '../financas/dto/create-meta.dto';

export interface PendingAction {
  tipo: 'pagar' | 'aportar' | 'cancelar';
  ids?: string[];
  metaId?: string;
  valorCentavos?: number;
  nomes: string[];
}

export interface NinaReply {
  resposta: string;
  acao: string;
  pendente?: PendingAction | null;
}

const AFIRMA = /(^|\b)(sim|isso|pode|confirmo|confirmar|claro|ok|paga|pode pagar|positivo|afirmativo)(\b|$)/i;
const NEGA = /(^|\b)(n[aã]o|cancela|cancelar|deixa|depois|para|negativo)(\b|$)/i;

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
    private readonly recados: RecadosService,
    private readonly tarefas: TarefasService,
    private readonly lembretes: LembretesService,
    private readonly agenda: AgendaService,
    private readonly financeiro: FinanceiroService,
    private readonly financas: FinancasService,
  ) {}

  async processar(texto: string, pendente?: PendingAction | null): Promise<NinaReply> {
    // Confirmação de ação pendente (stateless: o cliente devolve `pendente`).
    if (pendente && pendente.tipo) {
      if (AFIRMA.test(texto)) return this.executar(pendente);
      if (NEGA.test(texto)) return { resposta: 'Ok, cancelei. Não fiz nada.', acao: 'cancelar_pendente', pendente: null };
      // não entendeu — segue interpretando normalmente, descartando o pendente.
    }

    const nowIso = new Date().toISOString();
    const { acao, dados, resposta } = await this.llm.intent(texto, nowIso);

    try {
      switch (acao) {
        case 'criar_recado':
          await this.recados.create({ conteudo: str(dados.conteudo) ?? texto, categoria: str(dados.categoria), remetente: 'Rodrigo' } as CreateRecadoDto);
          return { resposta, acao };
        case 'criar_tarefa':
          await this.tarefas.create({ titulo: str(dados.titulo) ?? texto, descricao: str(dados.descricao), prazo: str(dados.prazo) } as CreateTarefaDto);
          return { resposta, acao };
        case 'criar_lembrete':
          await this.lembretes.create({ titulo: str(dados.titulo) ?? texto, dataHora: str(dados.dataHora) ?? nowIso, descricao: str(dados.descricao), recorrencia: str(dados.recorrencia) as Recorrencia | undefined } as CreateLembreteDto);
          return { resposta, acao };
        case 'criar_conta':
          await this.financeiro.create({ tipo: (str(dados.tipo) as ContaTipo) ?? ContaTipo.A_PAGAR, descricao: str(dados.descricao) ?? texto, valorCentavos: cents(dados.valorCentavos), vencimento: str(dados.vencimento) ?? nowIso, categoria: str(dados.categoria), contraparte: str(dados.contraparte) } as CreateContaDto);
          return { resposta, acao };
        case 'criar_agenda':
          await this.agenda.create({ titulo: str(dados.titulo) ?? texto, inicio: str(dados.inicio) ?? nowIso, fim: str(dados.fim), local: str(dados.local), descricao: str(dados.descricao) } as CreateCompromissoDto);
          return { resposta, acao };
        case 'criar_meta':
          await this.financas.createMeta({ nome: str(dados.nome) ?? texto, valorAlvoCentavos: cents(dados.valorAlvoCentavos), prazo: str(dados.prazo), aporteMensalSugeridoCent: dados.aporteMensalSugeridoCent != null ? cents(dados.aporteMensalSugeridoCent) : undefined } as CreateMetaDto);
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

  private match(termo: string, alvo: string): boolean {
    const a = termo.toLowerCase().trim();
    const b = (alvo || '').toLowerCase();
    return Boolean(a) && (b.includes(a) || a.includes(b));
  }

  private async prepararPagar(busca: string): Promise<NinaReply> {
    const todas = await this.financeiro.list();
    const pend = todas.filter((c) => c.status !== 'PAGO');
    let matches = pend.filter((c) => this.match(busca, c.descricao));
    if (!matches.length && pend.length === 1) matches = pend;
    if (!matches.length) return { resposta: 'Não achei conta pendente que bata com isso. Pode dizer o nome exato?', acao: 'pagar_conta', pendente: null };
    const total = matches.reduce((s, c) => s + (c.valorCentavos || 0), 0);
    const nomes = matches.map((c) => c.descricao);
    return {
      resposta: `Encontrei ${matches.length} conta(s) pendente(s) (${reais(total)}): ${nomes.join(', ')}. Confirma o pagamento? (sim/não)`,
      acao: 'pagar_conta',
      pendente: { tipo: 'pagar', ids: matches.map((c) => c.id), nomes },
    };
  }

  private async prepararAportar(busca: string, valor: number): Promise<NinaReply> {
    const metas = await this.financas.listMetas();
    let meta = metas.find((m) => this.match(busca, m.nome));
    if (!meta && metas.length === 1) meta = metas[0];
    if (!meta) return { resposta: 'Não achei essa meta. Qual o nome dela?', acao: 'aportar_meta', pendente: null };
    if (!valor) return { resposta: `Quanto você quer aportar na meta "${meta.nome}"?`, acao: 'aportar_meta', pendente: null };
    return {
      resposta: `Aportar ${reais(valor)} na meta "${meta.nome}"? (sim/não)`,
      acao: 'aportar_meta',
      pendente: { tipo: 'aportar', metaId: meta.id, valorCentavos: valor, nomes: [meta.nome] },
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
      resposta: `Cancelar ${matches.length} compromisso(s): ${nomes.join(', ')}? (sim/não)`,
      acao: 'cancelar_agenda',
      pendente: { tipo: 'cancelar', ids: matches.map((c) => c.id), nomes },
    };
  }

  private async executar(pa: PendingAction): Promise<NinaReply> {
    try {
      if (pa.tipo === 'pagar') {
        for (const id of pa.ids ?? []) await this.financeiro.marcarQuitada(id);
        return { resposta: `Feito! Marquei ${pa.ids?.length ?? 0} conta(s) como paga(s): ${pa.nomes.join(', ')}.`, acao: 'confirmar', pendente: null };
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
