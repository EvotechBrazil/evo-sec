'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAgenda, fetchLembretes, fetchRecados } from '@/lib/api';
import {
  Card,
  SectionTitle,
  Pill,
  Loading,
  EmptyState,
  PageHeader,
} from '@/components/ui';

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export default function InicioPage() {
  const agenda = useQuery({ queryKey: ['agenda'], queryFn: fetchAgenda });
  const lembretes = useQuery({ queryKey: ['lembretes'], queryFn: fetchLembretes });
  const recados = useQuery({ queryKey: ['recados'], queryFn: fetchRecados });

  const compromissos = agenda.data?.slice(0, 5) ?? [];
  const proxLembretes = lembretes.data?.slice(0, 5) ?? [];
  const proxRecados = recados.data?.slice(0, 8) ?? [];

  return (
    <div className="pt-2">
      <PageHeader titulo="Seu dia" />

      <section className="mb-7">
        <SectionTitle>Hoje · próximos compromissos</SectionTitle>
        {agenda.isLoading ? (
          <Loading />
        ) : compromissos.length === 0 ? (
          <EmptyState>Nada na agenda por enquanto.</EmptyState>
        ) : (
          <div className="space-y-2">
            {compromissos.map((c) => (
              <Card key={c.id}>
                <p className="font-semibold text-white">{c.titulo}</p>
                <p className="mt-0.5 text-sm text-neutral-400">
                  <span className="text-yellow-400">{fmt(c.inicio)}</span>
                  {c.local ? ` · ${c.local}` : ''}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mb-7">
        <SectionTitle>Lembretes</SectionTitle>
        {lembretes.isLoading ? (
          <Loading />
        ) : proxLembretes.length === 0 ? (
          <EmptyState>Nenhum lembrete pendente.</EmptyState>
        ) : (
          <div className="space-y-2">
            {proxLembretes.map((l) => (
              <Card key={l.id}>
                <p className="font-semibold text-white">{l.titulo}</p>
                <p className="mt-0.5 text-sm text-neutral-400">{fmt(l.dataHora)}</p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mb-2">
        <SectionTitle>Recados</SectionTitle>
        {recados.isLoading ? (
          <Loading />
        ) : proxRecados.length === 0 ? (
          <EmptyState>Sem recados novos.</EmptyState>
        ) : (
          <div className="space-y-2">
            {proxRecados.map((r) => (
              <Card key={r.id}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-white">{r.conteudo}</p>
                  <Pill
                    tone={
                      r.prioridade === 'ALTA'
                        ? 'red'
                        : r.prioridade === 'NORMAL'
                          ? 'amber'
                          : 'zinc'
                    }
                  >
                    {r.prioridade.toLowerCase()}
                  </Pill>
                </div>
                <p className="mt-0.5 text-sm text-neutral-400">
                  {r.remetente ?? 'Anônimo'} · {r.categoria ?? 'geral'}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
