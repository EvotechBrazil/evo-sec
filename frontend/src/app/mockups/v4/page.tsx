'use client';

import { usuario, agenda, recados, aguardando, financeiro, metas, custo, brl } from '@/app/mockups/_data';

const acoes = ['Anotar recado', 'Minha agenda', 'Finanças', 'Lembretes'];
const ondas = [5, 11, 7, 16, 9, 22, 13, 26, 14, 20, 8, 17, 6, 12, 5];

export default function VoiceOrbPage() {
  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[420px] flex-col overflow-hidden bg-black text-white">
      {/* gradiente radial escuro de fundo */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(250,204,21,0.10),transparent_60%)]" />

      {/* Header mínimo */}
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
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-yellow-500/30 bg-zinc-900 text-xs font-bold text-yellow-400">
          {custo.custoUsd.toFixed(2)}
        </div>
      </header>

      {/* ORBE central protagonista */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        <div className="relative flex h-64 w-64 items-center justify-center">
          {/* anéis concêntricos animados */}
          <span className="absolute h-full w-full animate-ping rounded-full border border-yellow-400/20 [animation-duration:3s]" />
          <span className="absolute h-48 w-48 animate-ping rounded-full border border-yellow-400/30 [animation-duration:2.2s]" />
          <span className="absolute h-40 w-40 animate-pulse rounded-full border border-amber-400/20" />
          {/* glow externo */}
          <span className="absolute h-44 w-44 rounded-full bg-yellow-500/30 blur-3xl" />
          {/* orbe */}
          <button
            type="button"
            className="relative flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 shadow-[0_0_80px_15px_rgba(250,204,21,0.55)] transition active:scale-95"
            aria-label="Toque para falar com a Nina"
          >
            <span className="absolute h-36 w-36 animate-pulse rounded-full bg-yellow-200/30" />
            <svg viewBox="0 0 24 24" className="relative h-12 w-12 text-black" fill="currentColor">
              <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
              <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 1 0 2 0v-3.08A7 7 0 0 0 19 11Z" />
            </svg>
          </button>
        </div>

        <p className="mt-8 text-center text-base font-medium text-zinc-200">
          Toque para falar com a <span className="font-bold text-yellow-400">Nina</span>
        </p>

        {/* waveform fake */}
        <div className="mt-5 flex h-8 items-end gap-1">
          {ondas.map((h, i) => (
            <span
              key={i}
              className="w-1 animate-pulse rounded-full bg-gradient-to-t from-amber-500 to-yellow-300"
              style={{ height: `${h * 1.2}px`, animationDelay: `${i * 90}ms`, animationDuration: '1.1s' }}
            />
          ))}
        </div>

        {/* linha de contexto */}
        <p className="mt-6 text-center text-xs text-zinc-400">
          Você tem <span className="font-semibold text-yellow-400">{agenda.length} compromissos</span> e{' '}
          <span className="font-semibold text-yellow-400">{recados.length} recados</span> hoje
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full border border-yellow-500/20 bg-zinc-900/80 px-3 py-1 text-[11px] text-zinc-300">
            {agenda[0].hora} · {agenda[0].titulo.split(' (')[0]}
          </span>
          <span className="rounded-full border border-yellow-500/20 bg-zinc-900/80 px-3 py-1 text-[11px] text-zinc-300">
            {aguardando.length} aguardando · saldo {brl(financeiro.saldoCentavos)}
          </span>
          <span className="rounded-full border border-yellow-500/20 bg-zinc-900/80 px-3 py-1 text-[11px] text-zinc-300">
            Meta: {metas[0].nome} {metas[0].pct}%
          </span>
        </div>
      </main>

      {/* Chips de ação rápida */}
      <div className="relative z-10 px-5 pb-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {acoes.map((a) => (
            <button
              key={a}
              type="button"
              className="rounded-full border border-yellow-500/40 bg-zinc-900/70 px-4 py-2 text-xs font-medium text-yellow-200 backdrop-blur transition hover:border-yellow-400 hover:text-yellow-300 active:scale-95"
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Barra inferior fake */}
      <nav className="relative z-10 flex items-center justify-around border-t border-zinc-800/80 bg-black/60 px-6 pb-6 pt-3 backdrop-blur">
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
        {/* microfone central destacado */}
        <button
          type="button"
          aria-label="Falar"
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
