'use client';

import { usuario, agenda, recados, aguardando, financeiro, metas, custo, brl } from '@/app/mockups/_data';

const recadoAlta = recados.find((r) => r.prioridade === 'ALTA') ?? recados[0];
const hoje = agenda.slice(0, 2);
const meta = metas[0];

export default function Page() {
  return (
    <div className="min-h-[100dvh] bg-neutral-950 text-white flex justify-center">
      <main className="w-full max-w-[390px] px-5 pt-8 pb-28">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500">{usuario.saudacao},</p>
            <h1 className="text-2xl font-semibold tracking-tight">{usuario.nome}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="grid h-10 w-10 place-items-center rounded-full border border-white/5 bg-zinc-900" aria-label="Notificações">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-zinc-300" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
              <span className="absolute -mt-6 ml-5 h-2 w-2 rounded-full bg-yellow-400" />
            </button>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-yellow-400 font-bold text-black">{usuario.nome[0]}</div>
          </div>
        </header>

        {/* HERO saldo */}
        <section className="relative mt-6 overflow-hidden rounded-3xl border border-yellow-400/20 bg-gradient-to-br from-yellow-400/15 via-zinc-900 to-neutral-900 p-6 shadow-2xl shadow-yellow-400/20">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-yellow-400/20 blur-2xl" />
          <p className="text-xs uppercase tracking-widest text-zinc-400">Saldo atual</p>
          <div className="mt-2 flex items-end gap-3">
            <span className="text-4xl font-semibold tracking-tight">{brl(financeiro.saldoCentavos)}</span>
            <span className="mb-1 flex items-center gap-1 text-sm font-medium text-yellow-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 14l5-5 5 5" /></svg>
              {financeiro.variacaoPct}%
            </span>
          </div>
          <div className="mt-5 flex gap-3">
            <span className="flex-1 rounded-2xl border border-white/5 bg-black/30 px-3 py-2 text-xs">
              <span className="block text-zinc-500">Entradas</span>
              <span className="font-medium text-emerald-400">{brl(financeiro.entradasCentavos)}</span>
            </span>
            <span className="flex-1 rounded-2xl border border-white/5 bg-black/30 px-3 py-2 text-xs">
              <span className="block text-zinc-500">Saídas</span>
              <span className="font-medium text-rose-400">{brl(financeiro.saidasCentavos)}</span>
            </span>
          </div>
        </section>

        {/* Hoje */}
        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-300">Hoje</h2>
            <span className="text-xs text-zinc-500">{hoje.length} compromissos</span>
          </div>
          <div className="space-y-2.5">
            {hoje.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-3xl border border-white/5 bg-neutral-900 p-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-yellow-400/10 text-sm font-semibold text-yellow-400">{a.hora}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.titulo}</p>
                  <p className="truncate text-xs text-zinc-500">{a.local}</p>
                </div>
                <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-[10px] text-zinc-400">{a.tag}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Pendência prioridade ALTA */}
        <section className="mt-7">
          <h2 className="mb-3 text-sm font-medium text-zinc-300">Precisa de atenção</h2>
          <div className="rounded-3xl border border-yellow-400/30 bg-gradient-to-br from-yellow-400/10 to-neutral-900 p-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-bold text-black">ALTA</span>
              <span className="text-xs text-zinc-400">{recadoAlta.categoria}</span>
            </div>
            <p className="mt-2 text-sm">{recadoAlta.conteudo}</p>
            {recadoAlta.remetente && <p className="mt-1 text-xs text-zinc-500">de {recadoAlta.remetente}</p>}
          </div>
          <div className="mt-2.5 rounded-3xl border border-white/5 bg-neutral-900 p-4 text-sm">
            <p className="text-zinc-300">Aguardando retorno</p>
            <p className="mt-1 text-xs text-zinc-500">{aguardando[0].titulo} · {aguardando[0].de} · {aguardando[0].prazo}</p>
          </div>
        </section>

        {/* Meta */}
        <section className="mt-7">
          <h2 className="mb-3 text-sm font-medium text-zinc-300">Sua meta</h2>
          <div className="rounded-3xl border border-white/5 bg-neutral-900 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{meta.nome}</p>
              <span className="text-sm font-semibold text-yellow-400">{meta.pct}%</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300" style={{ width: `${meta.pct}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-zinc-500">
              <span>{brl(meta.atualCentavos)}</span>
              <span>{brl(meta.alvoCentavos)}</span>
            </div>
          </div>
        </section>

        {/* Ações rápidas */}
        <section className="mt-7">
          <div className="flex gap-3">
            <button className="flex-1 rounded-2xl bg-yellow-400 py-3 text-sm font-semibold text-black">Falar com a Nina</button>
            <button className="rounded-2xl border border-white/5 bg-neutral-900 px-4 py-3 text-sm text-zinc-300">+ Recado</button>
          </div>
          <p className="mt-3 text-center text-[11px] text-zinc-600">Custo da IA hoje: US$ {custo.custoUsd.toFixed(2)}</p>
        </section>
      </main>

      {/* Bottom bar */}
      <nav className="fixed bottom-0 w-full max-w-[390px] border-t border-white/5 bg-neutral-950/90 px-7 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          {[
            { d: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', on: true },
            { d: 'M8 2v4M16 2v4M3 9h18M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z' },
            { d: 'M12 2a4 4 0 0 1 4 4v8a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4zM5 11a7 7 0 0 0 14 0M12 18v4' },
            { d: 'M3 3v18h18M7 14l4-4 3 3 5-6' },
            { d: 'M20 6L9 17l-5-5' },
          ].map((i, n) => (
            <button key={n} aria-label={`Aba ${n + 1}`} className="grid place-items-center">
              <svg viewBox="0 0 24 24" className={`h-6 w-6 ${i.on ? 'text-yellow-400' : 'text-zinc-600'}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={i.d} />
              </svg>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
