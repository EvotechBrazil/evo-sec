'use client';

import { usuario, agenda, recados, financeiro, brl } from '@/app/mockups/_data';

const ondas = [6, 12, 8, 18, 10, 24, 14, 28, 15, 22, 9, 19, 7, 13, 6];

function Sparkline({ pontos }: { pontos: number[] }) {
  const min = Math.min(...pontos);
  const max = Math.max(...pontos);
  const span = max - min || 1;
  const d = pontos
    .map((v, i) => `${(i / (pontos.length - 1)) * 100},${28 - ((v - min) / span) * 24}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-8 w-full">
      <polyline points={d} fill="none" stroke="#facc15" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function NoirVoiceCockpitPage() {
  const pendencia = recados.find((r) => r.prioridade === 'ALTA');
  const prox = agenda[0];

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[420px] flex-col overflow-hidden bg-neutral-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(250,204,21,0.10),transparent_60%)]" />

      {/* Header curto */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-6">
        <div>
          <p className="text-sm text-zinc-400">
            {usuario.saudacao}, <span className="font-semibold text-white">{usuario.nome}</span>
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-400" />
            </span>
            <span className="text-xs font-medium tracking-wide text-yellow-400">ouvindo...</span>
          </div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-neutral-900 text-[11px] font-bold text-yellow-400">
          Nina
        </div>
      </header>

      {/* ORBE protagonista */}
      <main className="relative z-10 flex flex-col items-center px-6 pt-8">
        <div className="relative flex h-56 w-56 items-center justify-center">
          <span className="absolute h-full w-full animate-ping rounded-full border border-yellow-400/20 [animation-duration:3s]" />
          <span className="absolute h-44 w-44 animate-ping rounded-full border border-yellow-400/30 [animation-duration:2.2s]" />
          <span className="absolute h-36 w-36 animate-pulse rounded-full border border-amber-400/20" />
          <span className="absolute h-40 w-40 rounded-full bg-yellow-500/30 blur-3xl" />
          <button
            type="button"
            aria-label="Toque para falar com a Nina"
            className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 shadow-[0_0_80px_-10px_rgba(250,204,21,0.6)] transition active:scale-95"
          >
            <span className="absolute h-32 w-32 animate-pulse rounded-full bg-yellow-200/30" />
            <svg viewBox="0 0 24 24" className="relative h-11 w-11 text-black" fill="currentColor">
              <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
              <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 1 0 2 0v-3.08A7 7 0 0 0 19 11Z" />
            </svg>
          </button>
        </div>

        <p className="mt-6 text-center font-impact text-xl uppercase tracking-wide text-zinc-200">
          Toque para falar com a <span className="text-yellow-400">Nina</span>
        </p>

        {/* waveform */}
        <div className="mt-4 flex h-7 items-end gap-1">
          {ondas.map((h, i) => (
            <span
              key={i}
              className="w-1 animate-pulse rounded-full bg-gradient-to-t from-amber-500 to-yellow-300"
              style={{ height: `${h}px`, animationDelay: `${i * 90}ms`, animationDuration: '1.1s' }}
            />
          ))}
        </div>

        <p className="mt-5 text-center text-xs text-zinc-400">
          Você tem <span className="font-semibold text-yellow-400">{agenda.length} compromissos</span> e{' '}
          <span className="font-semibold text-yellow-400">{recados.length} recados</span>
        </p>
      </main>

      {/* Cards noir de suporte (scroll) */}
      <section className="relative z-10 mt-5 flex-1 space-y-3 overflow-y-auto px-5 pb-28">
        <div className="rounded-3xl border border-white/5 bg-neutral-900 p-4 shadow-lg shadow-black/30">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] text-zinc-400">Saldo atual</p>
              <p className="font-impact text-2xl tracking-wide text-white">{brl(financeiro.saldoCentavos)}</p>
            </div>
            <span className="text-xs font-semibold text-yellow-400">+{financeiro.variacaoPct}%</span>
          </div>
          <div className="mt-2">
            <Sparkline pontos={financeiro.serie} />
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-3xl border border-white/5 bg-neutral-900 p-4 shadow-lg shadow-black/30">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-yellow-400/10 text-sm font-bold text-yellow-400">
            {prox.hora}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-zinc-400">Próximo compromisso</p>
            <p className="truncate text-sm font-medium text-white">{prox.titulo}</p>
            <p className="text-[11px] text-zinc-500">{prox.local}</p>
          </div>
        </div>

        {pendencia && (
          <div className="flex items-start gap-3 rounded-3xl border border-amber-400/20 bg-neutral-900 p-4 shadow-lg shadow-black/30">
            <span className="mt-1 inline-flex shrink-0 items-center rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-400">
              ALTA
            </span>
            <div className="min-w-0">
              <p className="text-[11px] text-zinc-400">Pendência prioritária</p>
              <p className="text-sm font-medium text-white">{pendencia.conteudo}</p>
            </div>
          </div>
        )}
      </section>

      {/* Barra inferior fake */}
      <nav className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-white/5 bg-neutral-950/80 px-6 pb-6 pt-3 backdrop-blur">
        <button type="button" aria-label="Início" className="text-zinc-500 transition hover:text-zinc-300">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 11l9-8 9 8M5 10v10h14V10" />
          </svg>
        </button>
        <button type="button" aria-label="Recados" className="text-zinc-500 transition hover:text-zinc-300">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v12H7l-3 3V5Z" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Falar com a Nina"
          className="-mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 text-black shadow-[0_0_30px_6px_rgba(250,204,21,0.5)] transition active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
            <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
            <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 1 0 2 0v-3.08A7 7 0 0 0 19 11Z" />
          </svg>
        </button>
        <button type="button" aria-label="Finanças" className="text-zinc-500 transition hover:text-zinc-300">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m5 14V9m5 10V7m5 12V11" />
          </svg>
        </button>
        <button type="button" aria-label="Perfil" className="text-zinc-500 transition hover:text-zinc-300">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0" />
          </svg>
        </button>
      </nav>
    </div>
  );
}
