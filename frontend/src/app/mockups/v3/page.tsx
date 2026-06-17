'use client';

import { usuario, agenda, recados, aguardando, financeiro, metas, custo, brl } from '@/app/mockups/_data';

export default function MockupV3() {
  void metas;
  void custo;

  return (
    <div className="min-h-[100dvh] w-full bg-black text-white font-sans antialiased flex justify-center">
      <div className="w-full max-w-[390px] px-6 pb-28 pt-10">
        {/* Header */}
        <header className="flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">{usuario.saudacao}</p>
            <h1 className="mt-1 text-xl font-light tracking-tight text-zinc-200">{usuario.nome}</h1>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-sm font-light text-zinc-400">
            {usuario.nome.charAt(0)}
          </div>
        </header>

        {/* Número-herói */}
        <section className="mt-14">
          <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">Saldo atual</p>
          <p className="mt-3 text-5xl font-extralight tracking-tight text-yellow-400">{brl(financeiro.saldoCentavos)}</p>
          <p className="mt-3 text-[13px] font-light text-zinc-500">
            {agenda.length} compromissos hoje
            <span className="mx-2 text-zinc-700">·</span>
            +{financeiro.variacaoPct}% no mês
          </p>
        </section>

        {/* Agenda */}
        <section className="mt-12">
          <p className="mb-2 text-[11px] uppercase tracking-[0.28em] text-zinc-500">Agenda</p>
          <ul>
            {agenda.map((item) => (
              <li key={item.id} className="flex items-baseline gap-4 border-t border-white/10 py-4">
                <span className="w-12 shrink-0 text-sm font-light tabular-nums text-zinc-400">{item.hora}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-light text-zinc-200">{item.titulo}</span>
                  <span className="mt-0.5 block text-[11px] font-light text-zinc-600">
                    {item.local}
                    <span className="mx-1.5 text-zinc-800">·</span>
                    {item.tag}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Pendências / recados */}
        <section className="mt-10">
          <p className="mb-2 text-[11px] uppercase tracking-[0.28em] text-zinc-500">Pendências</p>
          <ul>
            {recados.map((r) => (
              <li key={r.id} className="flex items-center gap-3 border-t border-white/10 py-3.5">
                <span
                  className={`h-1 w-1 shrink-0 rounded-full ${r.prioridade === 'ALTA' ? 'bg-yellow-400' : 'bg-zinc-700'}`}
                />
                <span className="min-w-0 flex-1 truncate text-[13px] font-light text-zinc-300">{r.conteudo}</span>
                <span className="shrink-0 text-[11px] font-light text-zinc-600">{r.remetente ?? r.categoria}</span>
              </li>
            ))}
            {aguardando.map((a) => (
              <li key={a.id} className="flex items-center gap-3 border-t border-white/10 py-3.5">
                <span className="h-1 w-1 shrink-0 rounded-full bg-zinc-700" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-light text-zinc-500">
                  Aguardando: {a.titulo}
                </span>
                <span className="shrink-0 text-[11px] font-light text-zinc-600">{a.prazo}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="mt-12">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-2xl bg-yellow-400 px-6 py-4 text-sm font-medium text-black transition active:scale-[0.99]"
          >
            Falar com a Nina
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </section>
      </div>

      {/* Barra inferior */}
      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-[390px] items-center justify-around border-t border-white/10 bg-black/90 px-6 py-4 backdrop-blur">
        {[
          { k: 'home', active: true, path: 'M3 11l9-8 9 8M5 10v10h14V10' },
          { k: 'agenda', active: false, path: 'M4 5h16v16H4zM4 9h16M8 3v4M16 3v4' },
          { k: 'fin', active: false, path: 'M3 7h18v12H3zM3 11h18M7 15h4' },
          { k: 'perfil', active: false, path: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0' },
        ].map((n) => (
          <button key={n.k} type="button" className="relative flex flex-col items-center">
            <svg
              width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
              className={n.active ? 'text-zinc-100' : 'text-zinc-600'}
            >
              <path d={n.path} />
            </svg>
            {n.active && <span className="absolute -bottom-2 h-1 w-1 rounded-full bg-yellow-400" />}
          </button>
        ))}
      </nav>
    </div>
  );
}
