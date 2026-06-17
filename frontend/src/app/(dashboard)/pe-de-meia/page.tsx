'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchEvolucao, fetchInvestimentos, reais } from '@/lib/api';

export default function PeDeMeiaPage() {
  const evolucao = useQuery({ queryKey: ['evolucao'], queryFn: fetchEvolucao });
  const investimentos = useQuery({ queryKey: ['investimentos'], queryFn: fetchInvestimentos });

  return (
    <div className="pt-2">
      <h1 className="mb-1 text-2xl font-bold">Pé de meia</h1>
      <p className="mb-5 text-sm text-slate-500">Metas, aportes e investimentos de baixo risco.</p>

      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <p className="text-xs text-slate-400">Total investido</p>
        <p className="text-2xl font-bold text-emerald-600">
          {reais(evolucao.data?.totalInvestidoCentavos ?? 0)}
        </p>
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Metas</h2>
      <div className="mb-6 space-y-3">
        {evolucao.data?.metas.length === 0 && (
          <p className="text-sm text-slate-400">Nenhuma meta ainda.</p>
        )}
        {evolucao.data?.metas.map((m) => (
          <div key={m.id} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium">{m.nome}</p>
              {m.atrasada && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                  atrasada
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">
              {reais(m.valorAtualCentavos)} de {reais(m.valorAlvoCentavos)} · {m.progressoPct}%
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-nina-500"
                style={{ width: `${m.progressoPct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Investimentos
      </h2>
      <div className="space-y-2">
        {investimentos.data?.length === 0 && (
          <p className="text-sm text-slate-400">Nenhum investimento.</p>
        )}
        {investimentos.data?.map((i) => (
          <div key={i.id} className="flex justify-between rounded-xl bg-white p-4 shadow-sm">
            <div>
              <p className="font-medium">{i.tipo.replace(/_/g, ' ')}</p>
              <p className="text-sm text-slate-500">
                {i.instituicao ?? '—'} · risco {i.risco.toLowerCase()}
              </p>
            </div>
            <span className="font-semibold">{reais(i.valorAplicadoCent)}</span>
          </div>
        ))}
      </div>

      {evolucao.data?.disclaimer && (
        <p className="mt-6 rounded-lg bg-slate-100 p-3 text-xs text-slate-500">
          {evolucao.data.disclaimer}
        </p>
      )}
    </div>
  );
}
