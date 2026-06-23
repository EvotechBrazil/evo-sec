'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchVencimentos,
  fetchContas,
  fetchResumo,
  fetchCategorias,
  criarMovimentacao,
  baixarConta,
  excluirConta,
  reais,
  type Conta,
  type Categoria,
} from '@/lib/api';
import {
  Card,
  SectionTitle,
  Donut,
  Loading,
  EmptyState,
  PageHeader,
  type Segmento,
} from '@/components/ui';

const CORES = ['#f59e0b', '#34d399', '#fb7185', '#60a5fa', '#a78bfa', '#f472b6'];

function Kpi({ label, valor, cor }: { label: string; valor: string; cor: string }) {
  return (
    <Card className="!p-3">
      <p className="text-[11px] text-neutral-400">{label}</p>
      <p className={`mt-0.5 text-lg font-extrabold tracking-tight ${cor}`}>{valor}</p>
    </Card>
  );
}

const inputCls =
  'w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2.5 text-white placeholder:text-neutral-600 focus:border-yellow-400/60 focus:outline-none';

function LancamentoRapido({ categorias }: { categorias: Categoria[] }) {
  const qc = useQueryClient();
  const [tipo, setTipo] = useState<'ENTRADA' | 'SAIDA'>('SAIDA');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [msg, setMsg] = useState('');

  const mut = useMutation({
    mutationFn: () =>
      criarMovimentacao({
        tipo,
        descricao: descricao.trim() || (tipo === 'ENTRADA' ? 'Entrada avulsa' : 'Saída avulsa'),
        valorCentavos: Math.round(parseFloat(valor.replace(',', '.')) * 100) || 0,
        categoriaId: categoriaId || undefined,
      }),
    onSuccess: () => {
      setMsg(`${tipo === 'ENTRADA' ? 'Entrada' : 'Saída'} registrada ✓`);
      setValor('');
      setDescricao('');
      setCategoriaId('');
      qc.invalidateQueries({ queryKey: ['resumo'] });
      qc.invalidateQueries({ queryKey: ['contas'] });
      qc.invalidateQueries({ queryKey: ['vencimentos'] });
      setTimeout(() => setMsg(''), 2500);
    },
  });

  const cats = categorias.filter((c) => (tipo === 'ENTRADA' ? c.tipo === 'RECEITA' : c.tipo === 'DESPESA'));
  const podeEnviar = parseFloat(valor.replace(',', '.')) > 0 && !mut.isPending;

  return (
    <Card className="mb-6">
      <SectionTitle>Lançar no caixa</SectionTitle>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTipo('ENTRADA')}
          className={`rounded-xl py-2 text-sm font-semibold transition ${tipo === 'ENTRADA' ? 'bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/40' : 'bg-white/5 text-neutral-400'}`}
        >
          ↗ Entrada
        </button>
        <button
          type="button"
          onClick={() => setTipo('SAIDA')}
          className={`rounded-xl py-2 text-sm font-semibold transition ${tipo === 'SAIDA' ? 'bg-red-400/20 text-red-300 ring-1 ring-red-400/40' : 'bg-white/5 text-neutral-400'}`}
        >
          ↘ Saída
        </button>
      </div>
      <div className="space-y-2">
        <input inputMode="decimal" placeholder="Valor (R$)" value={valor} onChange={(e) => setValor(e.target.value)} className={inputCls} />
        <input placeholder="Descrição (ex: mão de obra)" value={descricao} onChange={(e) => setDescricao(e.target.value)} className={inputCls} />
        <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className={`${inputCls} text-neutral-300`}>
          <option value="">Categoria (opcional)</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!podeEnviar}
          onClick={() => mut.mutate()}
          className="w-full rounded-xl bg-gradient-to-r from-yellow-300 to-amber-500 py-2.5 font-bold text-black transition disabled:opacity-40"
        >
          {mut.isPending ? 'Lançando…' : 'Lançar'}
        </button>
        {msg ? <p className="text-center text-sm text-emerald-400">{msg}</p> : null}
        {mut.isError ? <p className="text-center text-sm text-red-400">Erro ao lançar. Tente de novo.</p> : null}
      </div>
    </Card>
  );
}

function ContaRow({
  c,
  onBaixar,
  baixando,
  onExcluir,
  excluindo,
}: {
  c: Conta;
  onBaixar?: (id: string) => void;
  baixando?: boolean;
  onExcluir?: (id: string) => void;
  excluindo?: boolean;
}) {
  const ehPagar = c.tipo === 'A_PAGAR';
  const pendente = c.status === 'PENDENTE' || c.status === 'ATRASADO';
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate font-medium text-white">{c.descricao}</p>
        <p className="text-sm text-neutral-400">
          vence {new Date(c.vencimento).toLocaleDateString('pt-BR')} · {c.status.toLowerCase()}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`font-bold ${ehPagar ? 'text-red-400' : 'text-emerald-400'}`}>
          {ehPagar ? '-' : '+'}
          {reais(c.valorCentavos)}
        </span>
        {pendente && onBaixar ? (
          <button
            type="button"
            onClick={() => onBaixar(c.id)}
            disabled={baixando}
            className="rounded-lg bg-white/5 px-2 py-1 text-xs font-semibold text-yellow-300 ring-1 ring-yellow-400/30 transition disabled:opacity-40"
          >
            baixar
          </button>
        ) : null}
        {onExcluir ? (
          <button
            type="button"
            onClick={() => onExcluir(c.id)}
            disabled={excluindo}
            aria-label="Excluir conta"
            title="Excluir"
            className="rounded-lg bg-white/5 px-2 py-1 text-xs font-semibold text-neutral-400 ring-1 ring-white/10 transition hover:text-red-300 disabled:opacity-40"
          >
            excluir
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function FinanceiroPage() {
  const qc = useQueryClient();
  const resumo = useQuery({ queryKey: ['resumo'], queryFn: fetchResumo });
  const venc = useQuery({ queryKey: ['vencimentos'], queryFn: fetchVencimentos });
  const contas = useQuery({ queryKey: ['contas'], queryFn: fetchContas });
  const categorias = useQuery({ queryKey: ['categorias'], queryFn: fetchCategorias });

  const baixaMut = useMutation({
    mutationFn: (id: string) => baixarConta(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resumo'] });
      qc.invalidateQueries({ queryKey: ['contas'] });
      qc.invalidateQueries({ queryKey: ['vencimentos'] });
    },
  });

  const excluirMut = useMutation({
    mutationFn: (id: string) => excluirConta(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resumo'] });
      qc.invalidateQueries({ queryKey: ['contas'] });
      qc.invalidateQueries({ queryKey: ['vencimentos'] });
    },
  });

  const pedirExcluir = (id: string) => {
    if (typeof window !== 'undefined' && window.confirm('Excluir esta conta? Esta ação não pode ser desfeita.')) {
      excluirMut.mutate(id);
    }
  };

  const lista = contas.data ?? [];
  const despesas = (resumo.data?.porCategoria ?? []).filter((l) => l.tipo === 'DESPESA');
  const totalDesp = despesas.reduce((s, l) => s + l.totalCentavos, 0);
  const segCategorias: Segmento[] = despesas.slice(0, 5).map((l, i) => ({
    label: l.chave,
    pct: Math.round((l.totalCentavos / (totalDesp || 1)) * 100),
    valor: reais(l.totalCentavos),
    color: CORES[i % CORES.length],
  }));

  return (
    <div className="pt-2">
      <PageHeader titulo="Finanças" sub="Caixa do mês · regime de caixa" />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Kpi label="Entrou" valor={reais(resumo.data?.entradasCentavos ?? 0)} cor="text-emerald-400" />
        <Kpi label="Saiu" valor={reais(resumo.data?.saidasCentavos ?? 0)} cor="text-red-400" />
        <Kpi label="Saldo" valor={reais(resumo.data?.saldoCentavos ?? 0)} cor="text-yellow-400" />
      </div>

      <LancamentoRapido categorias={categorias.data ?? []} />

      <Card className="mb-6">
        <SectionTitle>Despesas por categoria</SectionTitle>
        {resumo.isLoading ? (
          <Loading />
        ) : totalDesp === 0 ? (
          <EmptyState>Sem despesas no período.</EmptyState>
        ) : (
          <Donut segments={segCategorias} centerValue={reais(totalDesp)} centerLabel="saídas" />
        )}
      </Card>

      <SectionTitle right={venc.data?.length ? `${venc.data.length} conta(s)` : undefined}>Vencendo (7 dias)</SectionTitle>
      <Card className="mb-6 divide-y divide-white/5">
        {venc.isLoading ? (
          <Loading />
        ) : (venc.data?.length ?? 0) === 0 ? (
          <EmptyState>Nada vencendo nos próximos 7 dias.</EmptyState>
        ) : (
          venc.data?.map((c) => (
            <ContaRow
              key={c.id}
              c={c}
              onBaixar={baixaMut.mutate}
              baixando={baixaMut.isPending}
              onExcluir={pedirExcluir}
              excluindo={excluirMut.isPending}
            />
          ))
        )}
      </Card>

      <SectionTitle>Todas as contas</SectionTitle>
      <Card className="divide-y divide-white/5">
        {contas.isLoading ? (
          <Loading />
        ) : lista.length === 0 ? (
          <EmptyState>Nenhuma conta cadastrada.</EmptyState>
        ) : (
          lista.map((c) => (
            <ContaRow
              key={c.id}
              c={c}
              onBaixar={baixaMut.mutate}
              baixando={baixaMut.isPending}
              onExcluir={pedirExcluir}
              excluindo={excluirMut.isPending}
            />
          ))
        )}
      </Card>
    </div>
  );
}
