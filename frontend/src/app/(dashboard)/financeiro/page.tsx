'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchContas, fetchFluxo, fetchVencimentos, reais, type Conta } from '@/lib/api';

function ContaRow({ c }: { c: Conta }) {
  const cor = c.tipo === 'A_RECEBER' ? 'text-emerald-600' : 'text-red-600';
  return (
    <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
      <div>
        <p className="font-medium">{c.descricao}</p>
        <p className="text-sm text-slate-500">
          vence {new Date(c.vencimento).toLocaleDateString('pt-BR')} · {c.status.toLowerCase()}
        </p>
      </div>
      <span className={`font-semibold ${cor}`}>
        {c.tipo === 'A_PAGAR' ? '-' : '+'}
        {reais(c.valorCentavos)}
      </span>
    </div>
  );
}

export default function FinanceiroPage() {
  const fluxo = useQuery({ queryKey: ['fluxo'], queryFn: fetchFluxo });
  const venc = useQuery({ queryKey: ['vencimentos'], queryFn: fetchVencimentos });
  const contas = useQuery({ queryKey: ['contas'], queryFn: fetchContas });

  return (
    <div className="pt-2">
      <h1 className="mb-5 text-2xl font-bold">Financeiro</h1>

      <div className="mb-6 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-400">Entradas</p>
          <p className="font-semibold text-emerald-600">
            {reais(fluxo.data?.entradasCentavos ?? 0)}
          </p>
        </div>
        <div className="rounded-xl bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-400">Saídas</p>
          <p className="font-semibold text-red-600">{reais(fluxo.data?.saidasCentavos ?? 0)}</p>
        </div>
        <div className="rounded-xl bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-400">Saldo</p>
          <p className="font-semibold">{reais(fluxo.data?.saldoCentavos ?? 0)}</p>
        </div>
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Vencendo (7 dias)
      </h2>
      <div className="mb-6 space-y-2">
        {venc.data?.length === 0 && <p className="text-sm text-slate-400">Nada vencendo.</p>}
        {venc.data?.map((c) => <ContaRow key={c.id} c={c} />)}
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Todas as contas
      </h2>
      <div className="space-y-2">
        {contas.data?.length === 0 && <p className="text-sm text-slate-400">Nenhuma conta.</p>}
        {contas.data?.map((c) => <ContaRow key={c.id} c={c} />)}
      </div>
    </div>
  );
}
