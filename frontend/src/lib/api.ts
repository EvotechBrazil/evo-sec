import axios from 'axios';
import { getToken } from './auth';

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
