'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchFluxo, fetchVencimentos, fetchContas, reais, type Conta } from '@/lib/api';
import {
  Card,
  SectionTitle,
  Donut,
  Loading,
  EmptyState,
  PageHeader,
  type Segmento,
} from '@/components/ui';

function ContaRow({ c }: { c: Conta }) {
  const ehPagar = c.tipo === 'A_PAGAR';
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate font-medium text-white">{c.descricao}</p>
        <p className="text-sm text-neutral-400">
          vence {new Date(c.vencimento).toLocaleDateString('pt-BR')} · {c.status.toLowerCase()}
        </p>
      </div>
      <span className={`shrink-0 font-bold ${ehPagar ? 'text-red-400' : 'text-emerald-400'}`}>
        {ehPagar ? '-' : '+'}
        {reais(c.valorCentavos)}
      </span>
    </div>
  );
}

function Kpi({ label, valor, cor }: { label: string; valor: string; cor: string }) {
  return (
    <Card className="!p-3">
      <p className="text-[11px] text-neutral-400">{label}</p>
      <p className={`mt-0.5 text-lg font-extrabold tracking-tight ${cor}`}>{valor}</p>
    </Card>
  );
}

export default function FinanceiroPage() {
  const fluxo = useQuery({ queryKey: ['fluxo'], queryFn: fetchFluxo });
  const venc = useQuery({ queryKey: ['vencimentos'], queryFn: fetchVencimentos });
  const contas = useQuery({ queryKey: ['contas'], queryFn: fetchContas });

  const lista = contas.data ?? [];
  const somaReceber = lista
    .filter((c) => c.tipo === 'A_RECEBER')
    .reduce((acc, c) => acc + c.valorCentavos, 0);
  const somaPagar = lista
    .filter((c) => c.tipo === 'A_PAGAR')
    .reduce((acc, c) => acc + c.valorCentavos, 0);
  const total = somaReceber + somaPagar;

  const segments: Segmento[] = [
    {
      label: 'A receber',
      pct: Math.round((somaReceber / (total || 1)) * 100),
      valor: reais(somaReceber),
      color: '#34d399',
    },
    {
      label: 'A pagar',
      pct: Math.round((somaPagar / (total || 1)) * 100),
      valor: reais(somaPagar),
      color: '#fb7185',
    },
  ];

  return (
    <div className="pt-2">
      <PageHeader titulo="Finanças" />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Kpi label="Entradas" valor={reais(fluxo.data?.entradasCentavos ?? 0)} cor="text-emerald-400" />
        <Kpi label="Saídas" valor={reais(fluxo.data?.saidasCentavos ?? 0)} cor="text-red-400" />
        <Kpi label="Saldo" valor={reais(fluxo.data?.saldoCentavos ?? 0)} cor="text-yellow-400" />
      </div>

      <Card className="mb-6">
        <SectionTitle>A pagar × A receber</SectionTitle>
        {contas.isLoading ? (
          <Loading />
        ) : total === 0 ? (
          <EmptyState>Nenhuma conta cadastrada.</EmptyState>
        ) : (
          <Donut
            segments={segments}
            centerValue={reais(fluxo.data?.saldoCentavos ?? 0)}
            centerLabel="saldo"
          />
        )}
      </Card>

      <SectionTitle>Vencendo (7 dias)</SectionTitle>
      <Card className="mb-6 divide-y divide-white/5">
        {venc.isLoading ? (
          <Loading />
        ) : (venc.data?.length ?? 0) === 0 ? (
          <EmptyState>Nada vencendo nos próximos 7 dias.</EmptyState>
        ) : (
          venc.data?.map((c) => <ContaRow key={c.id} c={c} />)
        )}
      </Card>

      <SectionTitle>Todas as contas</SectionTitle>
      <Card className="divide-y divide-white/5">
        {contas.isLoading ? (
          <Loading />
        ) : lista.length === 0 ? (
          <EmptyState>Nenhuma conta cadastrada.</EmptyState>
        ) : (
          lista.map((c) => <ContaRow key={c.id} c={c} />)
        )}
      </Card>
    </div>
  );
}
