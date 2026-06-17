'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchTarefas } from '@/lib/api';
import { Card, Pill, Loading, EmptyState, PageHeader } from '@/components/ui';

export default function AguardandoPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['tarefas', 'AGUARDANDO'],
    queryFn: () => fetchTarefas('AGUARDANDO'),
  });

  return (
    <div className="pt-2">
      <PageHeader titulo="Aguardando" sub="Follow-ups que dependem de terceiros." />

      {isLoading ? (
        <Loading />
      ) : !data?.length ? (
        <EmptyState>Nada aguardando.</EmptyState>
      ) : (
        <div className="space-y-2">
          {data.map((t) => (
            <Card key={t.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{t.titulo}</p>
                  <p className="mt-0.5 text-sm text-neutral-400">
                    {t.aguardandoDe ? `Aguardando: ${t.aguardandoDe}` : 'Sem responsável'}
                    {t.prazo ? ` · prazo ${new Date(t.prazo).toLocaleDateString('pt-BR')}` : ''}
                  </p>
                </div>
                <Pill tone="amber">aguardando</Pill>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
