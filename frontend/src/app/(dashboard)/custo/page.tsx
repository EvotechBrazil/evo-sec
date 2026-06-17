'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchResumoCusto, usd } from '@/lib/api';
import {
  Card,
  SectionTitle,
  Donut,
  Loading,
  EmptyState,
  PageHeader,
  type Segmento,
} from '@/components/ui';

const CORES = ['#facc15', '#fbbf24', '#a3a3a3', '#fde68a', '#52525b'];

export default function CustoPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['custo'],
    queryFn: fetchResumoCusto,
  });

  if (isLoading || !data) {
    return (
      <div className="pt-2">
        <PageHeader titulo="Custo de IA" sub="Uso de tokens (OpenRouter) — últimos 30 dias." />
        <Loading />
      </div>
    );
  }

  const total = data.porModelo.reduce((acc, m) => acc + m.custoMicroUsd, 0);
  const segments: Segmento[] = data.porModelo.map((m, i) => ({
    label: m.modelo.split('/').pop() ?? m.modelo,
    pct: Math.round((m.custoMicroUsd / (total || 1)) * 100),
    valor: usd(m.custoMicroUsd),
    color: CORES[i % CORES.length],
  }));

  return (
    <div className="pt-2">
      <PageHeader titulo="Custo de IA" sub="Uso de tokens (OpenRouter) — últimos 30 dias." />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card className="!p-3">
          <p className="text-[11px] text-neutral-400">Custo</p>
          <p className="mt-0.5 text-lg font-extrabold tracking-tight text-yellow-400">
            {usd(data.custoMicroUsd)}
          </p>
        </Card>
        <Card className="!p-3">
          <p className="text-[11px] text-neutral-400">Tokens in</p>
          <p className="mt-0.5 text-lg font-extrabold tracking-tight text-white">
            {data.tokensIn.toLocaleString('pt-BR')}
          </p>
        </Card>
        <Card className="!p-3">
          <p className="text-[11px] text-neutral-400">Tokens out</p>
          <p className="mt-0.5 text-lg font-extrabold tracking-tight text-white">
            {data.tokensOut.toLocaleString('pt-BR')}
          </p>
        </Card>
      </div>

      <SectionTitle>Por modelo</SectionTitle>
      <Card>
        {segments.length === 0 ? (
          <EmptyState>Sem uso registrado ainda.</EmptyState>
        ) : (
          <Donut segments={segments} centerValue={usd(total)} centerLabel="total" />
        )}
      </Card>
    </div>
  );
}
