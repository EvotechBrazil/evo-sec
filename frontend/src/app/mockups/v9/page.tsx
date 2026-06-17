'use client';

import { usuario, agenda, recados, aguardando, financeiro, metas, custo, brl } from '@/app/mockups/_data';

export default function MockupV9() {
  const serie = financeiro.serie;
  const min = Math.min(...serie);
  const max = Math.max(...serie);
  const W = 300;
  const H = 64;
  const pts = serie.map((v, i) => {
    const x = (i / (serie.length - 1)) * W;
    const y = H - ((v - min) / (max - min || 1)) * H;
    return [x, y] as const;
  });
  const linha = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `0,${H} ${linha} ${W},${H}`;
  const pendencia = recados.find((r) => r.prioridade === 'ALTA');

  return (
    <div className="min-h-[100dvh] bg-neutral-950 text-white flex justify-center">
      <div className="relative w-full max-w-[390px] px-5 pb-28 pt-10">
        {/* glow âmbar topo */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(251,191,36,0.22),transparent_70%)]" />

        {/* header editorial */}
        <header className="relative">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-amber-400/80">Nina · secretária</p>
          <h1 className="mt-2 text-4xl font-light leading-[1.05] tracking-tight">
            {usuario.saudacao},<br />
            <span className="font-extrabold bg-gradient-to-r from-yellow-200 via-amber-300 to-amber-500 bg-clip-text text-transparent">
              {usuario.nome}
            </span>
          </h1>
        </header>

        {/* herói saldo + orbe */}
        <section className="relative mt-7 rounded-3xl border border-white/5 bg-neutral-900 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">Saldo atual</p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight">{brl(financeiro.saldoCentavos)}</p>
              <p className="mt-1 font-mono text-xs text-amber-400">▲ {financeiro.variacaoPct}% na semana</p>
            </div>
            <button className="group relative flex flex-col items-center" aria-label="Falar com a Nina">
              <span className="absolute inset-0 -m-1 rounded-full bg-amber-400/30 blur-xl" />
              <span className="relative grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 shadow-lg shadow-amber-500/30">
                <span className="absolute inset-0 rounded-full ring-2 ring-amber-300/50 animate-pulse" />
                <svg viewBox="0 0 24 24" className="h-7 w-7 text-neutral-950" fill="currentColor">
                  <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                </svg>
              </span>
              <span className="relative mt-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-400">Falar</span>
            </button>
          </div>
        </section>

        {/* hoje / agenda */}
        <section className="mt-7">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-bold tracking-tight">Hoje</h2>
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">{agenda.length} compromissos</span>
          </div>
          <ul className="mt-3 space-y-2">
            {agenda.map((a) => (
              <li key={a.id} className="flex items-center gap-4 rounded-3xl border border-white/5 bg-neutral-900 px-4 py-3">
                <span className="font-mono text-sm font-bold text-amber-400">{a.hora}</span>
                <span className="h-8 w-px bg-white/10" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{a.titulo}</span>
                  <span className="block truncate text-xs text-zinc-400">{a.local} · {a.tag}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* gráfico de área */}
        <section className="mt-7 rounded-3xl border border-white/5 bg-neutral-900 p-5">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">Saldo · 7 dias</p>
            <p className="font-mono text-xs text-amber-400">{brl(financeiro.saldoCentavos)}</p>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-16 w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="g9" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(251,191,36)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="rgb(251,191,36)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={area} fill="url(#g9)" />
            <polyline points={linha} fill="none" stroke="rgb(250,204,21)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </section>

        {/* pendência ALTA */}
        {pendencia && (
          <section className="mt-7 rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-400/10 to-transparent p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-400">Prioridade alta</p>
            <p className="mt-2 text-base font-semibold leading-snug">{pendencia.conteudo}</p>
            <p className="mt-1 text-xs text-zinc-400">{pendencia.remetente ?? 'Sem remetente'} · {pendencia.categoria}</p>
          </section>
        )}

        {/* metas em barras finas */}
        <section className="mt-7">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-bold tracking-tight">Metas</h2>
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">{aguardando.length} aguardando</span>
          </div>
          <ul className="mt-3 space-y-4">
            {metas.map((m) => (
              <li key={m.id}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{m.nome}</span>
                  <span className="font-mono text-xs text-zinc-400">{brl(m.atualCentavos)} / {brl(m.alvoCentavos)}</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-amber-500" style={{ width: `${m.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 font-mono text-[10px] text-zinc-500">
            custo IA hoje · ${custo.custoUsd.toFixed(2)} · {custo.porModelo[0].modelo.split('/')[0]} domina
          </p>
        </section>

        {/* barra inferior */}
        <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-[390px] items-center justify-around border-t border-white/5 bg-neutral-950/90 px-6 py-3 backdrop-blur">
          {[
            { k: 'home', d: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z', on: true },
            { k: 'agenda', d: 'M7 3v3M17 3v3M4 8h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z' },
            { k: 'financas', d: 'M3 12h4l2 6 4-12 2 6h6' },
            { k: 'perfil', d: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0' },
          ].map((i) => (
            <button key={i.k} aria-label={i.k} className={i.on ? 'text-amber-400' : 'text-zinc-500'}>
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d={i.d} />
              </svg>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
