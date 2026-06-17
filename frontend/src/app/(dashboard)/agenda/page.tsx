'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAgenda, type Compromisso } from '@/lib/api';
import { Card, SectionTitle, Pill, Loading, EmptyState, PageHeader } from '@/components/ui';

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const diaPorExtenso = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

const chaveDia = (iso: string) => new Date(iso).toISOString().slice(0, 10);

function agruparPorDia(itens: Compromisso[]): [string, Compromisso[]][] {
  const ordenados = [...itens].sort(
    (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
  );
  const grupos = new Map<string, Compromisso[]>();
  for (const c of ordenados) {
    const k = chaveDia(c.inicio);
    (grupos.get(k) ?? grupos.set(k, []).get(k)!).push(c);
  }
  return [...grupos.entries()];
}

export default function AgendaPage() {
  const { data, isLoading } = useQuery({ queryKey: ['agenda'], queryFn: fetchAgenda });

  if (isLoading) {
    return (
      <div className="pt-2">
        <PageHeader titulo="Agenda" sub="Seus compromissos" />
        <Loading />
      </div>
    );
  }

  const itens = data ?? [];
  const grupos = agruparPorDia(itens);

  return (
    <div className="pt-2">
      <PageHeader titulo="Agenda" sub="Seus compromissos" />

      {itens.length === 0 ? (
        <EmptyState>Nenhum compromisso.</EmptyState>
      ) : (
        <div className="space-y-6">
          {grupos.map(([dia, lista]) => (
            <section key={dia}>
              <SectionTitle>{diaPorExtenso(lista[0].inicio)}</SectionTitle>
              <div className="space-y-2">
                {lista.map((c) => (
                  <Card key={c.id} className="flex items-center gap-4">
                    <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl bg-yellow-400/10 px-3 py-2 text-yellow-400">
                      <span className="text-base font-extrabold tracking-tight">{hora(c.inicio)}</span>
                      {c.fim ? (
                        <span className="text-[10px] text-yellow-400/70">{hora(c.fim)}</span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-white">{c.titulo}</p>
                        {c.status ? <Pill tone="zinc">{c.status}</Pill> : null}
                      </div>
                      <p className="mt-0.5 truncate text-sm text-neutral-400">
                        {diaPorExtenso(c.inicio)}
                        {c.local ? ` · ${c.local}` : ''}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
