'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Card,
  SectionTitle,
  Pill,
  Progress,
  Loading,
  EmptyState,
  PageHeader,
} from '@/components/ui';
import { fetchEvolucao, fetchInvestimentos, reais } from '@/lib/api';

export default function PeDeMeiaPage() {
  const evolucao = useQuery({ queryKey: ['evolucao'], queryFn: fetchEvolucao });
  const investimentos = useQuery({ queryKey: ['investimentos'], queryFn: fetchInvestimentos });

  const carregando = evolucao.isLoading || investimentos.isLoading;
  const metas = evolucao.data?.metas ?? [];
  const lista = investimentos.data ?? [];

  return (
    <div className="pt-2">
      <PageHeader titulo="Pé de meia" sub="Metas, aportes e investimentos de baixo risco." />

      {carregando ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-neutral-900 to-neutral-950">
            <p className="text-[11px] uppercase tracking-wider text-neutral-400">Total investido</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-400">
              {reais(evolucao.data?.totalInvestidoCentavos ?? 0)}
            </p>
          </Card>

          <section>
            <SectionTitle>Metas</SectionTitle>
            {metas.length === 0 ? (
              <EmptyState>Nenhuma meta ainda.</EmptyState>
            ) : (
              <div className="space-y-3">
                {metas.map((m) => (
                  <Card key={m.id}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-white">{m.nome}</p>
                      {m.atrasada ? <Pill tone="amber">atrasada</Pill> : null}
                    </div>
                    <p className="mt-1 text-sm text-neutral-400">
                      {reais(m.valorAtualCentavos)} de {reais(m.valorAlvoCentavos)} · {m.progressoPct}%
                    </p>
                    <div className="mt-2">
                      <Progress pct={m.progressoPct} />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionTitle>Investimentos</SectionTitle>
            {lista.length === 0 ? (
              <EmptyState>Nenhum investimento.</EmptyState>
            ) : (
              <Card className="divide-y divide-white/5 !p-0">
                {lista.map((i) => (
                  <div key={i.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium capitalize text-white">
                        {i.tipo.replace(/_/g, ' ')}
                      </p>
                      <p className="truncate text-sm text-neutral-400">
                        {i.instituicao ?? '—'} · risco {i.risco.toLowerCase()}
                      </p>
                    </div>
                    <span className="shrink-0 font-bold text-white">{reais(i.valorAplicadoCent)}</span>
                  </div>
                ))}
              </Card>
            )}
          </section>

          {evolucao.data?.disclaimer ? (
            <div className="rounded-2xl bg-white/5 p-3 text-xs text-neutral-400">
              {evolucao.data.disclaimer}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
