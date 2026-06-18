import axios from 'axios';
import { getToken, clearToken } from './auth';

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 por token ausente/expirado → desloga e volta pro login (não fica falhando
// em silêncio). 401 de regra de negócio (ex.: senha atual incorreta) é repassado
// pra tela tratar; o login também trata o próprio 401.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const msg: string = error?.response?.data?.message ?? '';
    const url: string = error?.config?.url ?? '';
    const tokenIssue = /token|credenciais ausentes|expirad/i.test(msg);
    if (status === 401 && tokenIssue && !url.includes('/auth/login') && typeof window !== 'undefined') {
      clearToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// Envelope padrão do backend: { data, meta }
function unwrap<T>(payload: { data: T }): T {
  return payload.data;
}

export interface Recado {
  id: string;
  conteudo: string;
  remetente?: string | null;
  categoria?: string | null;
  prioridade: 'BAIXA' | 'NORMAL' | 'ALTA';
  status: string;
  createdAt: string;
}

export interface Tarefa {
  id: string;
  titulo: string;
  tipo: string;
  aguardandoDe?: string | null;
  prazo?: string | null;
  prioridade: string;
  status: string;
}

export interface Compromisso {
  id: string;
  titulo: string;
  inicio: string;
  fim?: string | null;
  local?: string | null;
  status: string;
}

export interface Lembrete {
  id: string;
  titulo: string;
  dataHora: string;
  status: string;
}

export async function login(email: string, password: string): Promise<string> {
  const { data } = await api.post<{ data: { accessToken: string } }>('/auth/login', {
    email,
    password,
  });
  return unwrap(data).accessToken;
}

export async function changePassword(senhaAtual: string, novaSenha: string): Promise<void> {
  await api.patch('/auth/senha', { senhaAtual, novaSenha });
}

export interface NinaReply {
  resposta: string;
  acao: string;
  pendente?: Record<string, unknown> | null;
}

export async function ninaMensagem(
  texto: string,
  pendente?: Record<string, unknown> | null,
): Promise<NinaReply> {
  const { data } = await api.post<{ data: NinaReply }>('/nina/mensagem', {
    texto,
    pendente: pendente ?? undefined,
  });
  return unwrap(data);
}

export async function fetchRecados(): Promise<Recado[]> {
  const { data } = await api.get<{ data: Recado[] }>('/recados');
  return unwrap(data);
}

export async function fetchTarefas(tipo?: string): Promise<Tarefa[]> {
  const { data } = await api.get<{ data: Tarefa[] }>('/tarefas', { params: tipo ? { tipo } : {} });
  return unwrap(data);
}

export async function fetchAgenda(): Promise<Compromisso[]> {
  const { data } = await api.get<{ data: Compromisso[] }>('/agenda');
  return unwrap(data);
}

export async function fetchLembretes(): Promise<Lembrete[]> {
  const { data } = await api.get<{ data: Lembrete[] }>('/lembretes');
  return unwrap(data);
}

export interface Conta {
  id: string;
  tipo: 'A_PAGAR' | 'A_RECEBER';
  descricao: string;
  categoria?: string | null;
  valorCentavos: number;
  vencimento: string;
  status: string;
  contraparte?: string | null;
}

export interface FluxoCaixa {
  entradasCentavos: number;
  saidasCentavos: number;
  saldoCentavos: number;
}

export async function fetchContas(): Promise<Conta[]> {
  const { data } = await api.get<{ data: Conta[] }>('/financeiro/contas');
  return unwrap(data);
}

export async function fetchFluxo(): Promise<FluxoCaixa> {
  const { data } = await api.get<{ data: FluxoCaixa }>('/financeiro/fluxo');
  return unwrap(data);
}

export async function fetchVencimentos(): Promise<Conta[]> {
  const { data } = await api.get<{ data: Conta[] }>('/financeiro/vencimentos', {
    params: { dias: 7 },
  });
  return unwrap(data);
}

export const reais = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export interface MetaEvolucao {
  id: string;
  nome: string;
  valorAlvoCentavos: number;
  valorAtualCentavos: number;
  prazo?: string | null;
  progressoPct: number;
  atrasada: boolean;
}

export interface Investimento {
  id: string;
  tipo: string;
  instituicao?: string | null;
  valorAplicadoCent: number;
  risco: string;
}

export interface Evolucao {
  metas: MetaEvolucao[];
  totalInvestidoCentavos: number;
  disclaimer: string;
}

export async function fetchEvolucao(): Promise<Evolucao> {
  const { data } = await api.get<{ data: Evolucao }>('/financas/evolucao');
  return unwrap(data);
}

export async function fetchInvestimentos(): Promise<Investimento[]> {
  const { data } = await api.get<{ data: Investimento[] }>('/financas/investimentos');
  return unwrap(data);
}

export interface ResumoCusto {
  custoMicroUsd: number;
  tokensIn: number;
  tokensOut: number;
  porModelo: { modelo: string; custoMicroUsd: number }[];
}

export async function fetchResumoCusto(): Promise<ResumoCusto> {
  const { data } = await api.get<{ data: ResumoCusto }>('/usos-llm/resumo', {
    params: { dias: 30 },
  });
  return unwrap(data);
}

export const usd = (micro: number) =>
  (micro / 1_000_000).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
