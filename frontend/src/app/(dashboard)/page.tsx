'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAgenda, fetchLembretes, fetchRecados } from '@/lib/api';

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        {titulo}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-white p-4 shadow-sm">{children}</div>;
}

const hora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export default function InicioPage() {
  const agenda = useQuery({ queryKey: ['agenda'], queryFn: fetchAgenda });
  const lembretes = useQuery({ queryKey: ['lembretes'], queryFn: fetchLembretes });
  const recados = useQuery({ queryKey: ['recados'], queryFn: fetchRecados });

  return (
    <div className="pt-2">
      <h1 className="mb-5 text-2xl font-bold">Seu dia</h1>

      <Secao titulo="Próximos compromissos">
        {agenda.isLoading && <p className="text-sm text-slate-400">Carregando…</p>}
        {agenda.data?.length === 0 && <p className="text-sm text-slate-400">Nada na agenda.</p>}
        {agenda.data?.slice(0, 5).map((c) => (
          <Card key={c.id}>
            <p className="font-medium">{c.titulo}</p>
            <p className="text-sm text-slate-500">
              {hora(c.inicio)} {c.local ? `· ${c.local}` : ''}
            </p>
          </Card>
        ))}
      </Secao>

      <Secao titulo="Lembretes">
        {lembretes.data?.length === 0 && <p className="text-sm text-slate-400">Sem lembretes.</p>}
        {lembretes.data?.slice(0, 5).map((l) => (
          <Card key={l.id}>
            <p className="font-medium">{l.titulo}</p>
            <p className="text-sm text-slate-500">{hora(l.dataHora)}</p>
          </Card>
        ))}
      </Secao>

      <Secao titulo="Recados">
        {recados.data?.length === 0 && <p className="text-sm text-slate-400">Sem recados.</p>}
        {recados.data?.slice(0, 8).map((r) => (
          <Card key={r.id}>
            <p className="font-medium">{r.conteudo}</p>
            <p className="text-sm text-slate-500">
              {r.remetente ?? 'Anônimo'} · {r.categoria ?? 'geral'} ·{' '}
              <span className={r.prioridade === 'ALTA' ? 'text-red-500' : ''}>
                {r.prioridade.toLowerCase()}
              </span>
            </p>
          </Card>
        ))}
      </Secao>
    </div>
  );
}
