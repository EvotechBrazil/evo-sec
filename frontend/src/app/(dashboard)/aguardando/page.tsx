'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchTarefas } from '@/lib/api';

export default function AguardandoPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['tarefas', 'AGUARDANDO'],
    queryFn: () => fetchTarefas('AGUARDANDO'),
  });

  return (
    <div className="pt-2">
      <h1 className="mb-1 text-2xl font-bold">Aguardando resposta</h1>
      <p className="mb-5 text-sm text-slate-500">Follow-ups que dependem de terceiros.</p>
      {isLoading && <p className="text-sm text-slate-400">Carregando…</p>}
      {data?.length === 0 && <p className="text-sm text-slate-400">Nada aguardando.</p>}
      <div className="space-y-2">
        {data?.map((t) => (
          <div key={t.id} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="font-medium">{t.titulo}</p>
            <p className="text-sm text-slate-500">
              {t.aguardandoDe ? `Aguardando: ${t.aguardandoDe}` : '—'}
              {t.prazo ? ` · prazo ${new Date(t.prazo).toLocaleDateString('pt-BR')}` : ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
