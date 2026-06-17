'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchResumoCusto, usd } from '@/lib/api';

export default function CustoPage() {
  const { data } = useQuery({ queryKey: ['custo'], queryFn: fetchResumoCusto });

  return (
    <div className="pt-2">
      <h1 className="mb-1 text-2xl font-bold">Custo de IA</h1>
      <p className="mb-5 text-sm text-slate-500">Uso de tokens (OpenRouter) — últimos 30 dias.</p>

      <div className="mb-6 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-400">Custo</p>
          <p className="font-semibold">{usd(data?.custoMicroUsd ?? 0)}</p>
        </div>
        <div className="rounded-xl bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-400">Tokens in</p>
          <p className="font-semibold">{(data?.tokensIn ?? 0).toLocaleString('pt-BR')}</p>
        </div>
        <div className="rounded-xl bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-400">Tokens out</p>
          <p className="font-semibold">{(data?.tokensOut ?? 0).toLocaleString('pt-BR')}</p>
        </div>
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Por modelo
      </h2>
      <div className="space-y-2">
        {data?.porModelo.length === 0 && (
          <p className="text-sm text-slate-400">Sem uso registrado ainda.</p>
        )}
        {data?.porModelo.map((m) => (
          <div key={m.modelo} className="flex justify-between rounded-xl bg-white p-4 shadow-sm">
            <span className="text-sm">{m.modelo}</span>
            <span className="font-semibold">{usd(m.custoMicroUsd)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
