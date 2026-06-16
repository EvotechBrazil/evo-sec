'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAgenda } from '@/lib/api';

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' });

export default function AgendaPage() {
  const { data, isLoading } = useQuery({ queryKey: ['agenda'], queryFn: fetchAgenda });

  return (
    <div className="pt-2">
      <h1 className="mb-5 text-2xl font-bold">Agenda</h1>
      {isLoading && <p className="text-sm text-slate-400">Carregando…</p>}
      {data?.length === 0 && <p className="text-sm text-slate-400">Nenhum compromisso.</p>}
      <div className="space-y-2">
        {data?.map((c) => (
          <div key={c.id} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="font-medium">{c.titulo}</p>
            <p className="text-sm text-slate-500">{fmt(c.inicio)}</p>
            {c.local && <p className="text-sm text-slate-400">{c.local}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
