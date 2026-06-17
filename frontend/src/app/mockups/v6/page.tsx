'use client';

import { usuario, agenda, recados, aguardando, financeiro, metas, custo, brl } from '@/app/mockups/_data';

function Mic({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

function Spark({ serie, color = 'rgb(250 204 21)' }: { serie: number[]; color?: string }) {
  const W = 64, H = 22, min = Math.min(...serie), max = Math.max(...serie);
  const pts = serie.map((v, i) => `${(i / (serie.length - 1)) * W},${H - ((v - min) / (max - min || 1)) * H}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-6 w-16">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Page() {
  const { serie } = financeiro;
  const W = 300, H = 90, min = Math.min(...serie), max = Math.max(...serie);
  const coords = serie.map((v, i) => ({ x: (i / (serie.length - 1)) * W, y: H - ((v - min) / (max - min || 1)) * H }));
  const linePath = coords.map((c, i) => `${i ? 'L' : 'M'}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${W} ${H} L0 ${H} Z`;
  const pendencia = recados.find((r) => r.prioridade === 'ALTA');
  const navIcons = ['M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z', 'M8 7V3m8 4V3M4 11h16M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', '', 'M12 2v20M5 12h14', 'M4 6h16M4 12h16M4 18h10'];

  return (
    <div className="flex min-h-[100dvh] justify-center bg-neutral-950 text-white">
      <div className="relative w-full max-w-[390px] px-4 pb-28 pt-5">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400">{usuario.saudacao},</p>
            <h1 className="font-impact text-xl tracking-wide">{usuario.nome}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative grid h-10 w-10 place-items-center rounded-full border border-white/5 bg-neutral-900">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 21h4" strokeLinecap="round" /></svg>
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-yellow-400" />
            </button>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 font-bold text-black">{usuario.nome[0]}</div>
          </div>
        </header>

        {/* HERO saldo + mini-orbe */}
        <section className="relative mt-5 overflow-hidden rounded-3xl border border-white/5 bg-neutral-900 p-5 shadow-lg shadow-black/40">
          <p className="text-xs text-zinc-400">Saldo atual</p>
          <p className="mt-1 font-impact text-4xl tracking-wide">{brl(financeiro.saldoCentavos)}</p>
          <p className="mt-1 text-sm font-medium text-yellow-400">+{financeiro.variacaoPct}% no mês</p>
          <button className="absolute right-4 top-4 grid place-items-center">
            <span className="absolute h-14 w-14 animate-ping rounded-full bg-yellow-400/20" />
            <span className="absolute h-16 w-16 animate-pulse rounded-full border border-yellow-400/30" />
            <span className="relative grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 text-black shadow-[0_0_60px_-10px_rgba(250,204,21,0.6)]">
              <Mic className="h-5 w-5" />
            </span>
          </button>
          <span className="mt-3 inline-block text-[11px] text-zinc-500">Toque no orbe para falar com a Nina</span>
        </section>

        {/* 2 KPIs com sparkline */}
        <section className="mt-3 grid grid-cols-2 gap-3">
          {[
            { l: 'Entradas', v: financeiro.entradasCentavos, s: serie },
            { l: 'Saídas', v: financeiro.saidasCentavos, s: [...serie].reverse() },
          ].map((k) => (
            <div key={k.l} className="rounded-3xl border border-white/5 bg-neutral-900 p-4">
              <p className="text-xs text-zinc-400">{k.l}</p>
              <p className="mt-1 font-impact text-lg tracking-wide">{brl(k.v)}</p>
              <div className="mt-1"><Spark serie={k.s} /></div>
            </div>
          ))}
        </section>

        {/* Gráfico de ÁREA — saldo 7 dias */}
        <section className="mt-3 rounded-3xl border border-white/5 bg-neutral-900 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Saldo · 7 dias</p>
            <span className="text-xs text-zinc-400">custo IA {brl(Math.round(custo.custoUsd * 530))}</span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="g6" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(250 204 21)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="rgb(250 204 21)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#g6)" />
            <path d={linePath} fill="none" stroke="rgb(250 204 21)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </section>

        {/* Hoje */}
        <section className="mt-3 rounded-3xl border border-white/5 bg-neutral-900 p-4">
          <p className="text-sm font-medium">Hoje</p>
          <ul className="mt-3 space-y-3">
            {agenda.slice(0, 2).map((a) => (
              <li key={a.id} className="flex items-center gap-3">
                <span className="grid h-10 w-12 shrink-0 place-items-center rounded-2xl bg-yellow-400/10 text-xs font-semibold text-yellow-400">{a.hora}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm">{a.titulo}</p>
                  <p className="text-xs text-zinc-400">{a.local} · {a.tag}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Pendência ALTA + meta */}
        {pendencia && (
          <section className="mt-3 rounded-3xl bg-yellow-400 p-4 text-black shadow-lg shadow-yellow-400/20">
            <p className="text-[11px] font-bold uppercase tracking-wide">Pendência alta</p>
            <p className="mt-1 text-sm font-medium">{pendencia.conteudo}</p>
            <div className="mt-3">
              <div className="flex justify-between text-[11px] font-medium"><span>{metas[0].nome}</span><span>{metas[0].pct}%</span></div>
              <div className="mt-1 h-2 w-full rounded-full bg-black/15"><div className="h-2 rounded-full bg-black" style={{ width: `${metas[0].pct}%` }} /></div>
            </div>
          </section>
        )}

        <p className="mt-4 text-center text-[11px] text-zinc-600">{aguardando.length} itens aguardando retorno</p>

        {/* Barra inferior */}
        <nav className="fixed bottom-0 left-1/2 flex w-full max-w-[390px] -translate-x-1/2 items-center justify-around border-t border-white/5 bg-neutral-900/90 px-4 py-3 backdrop-blur">
          {navIcons.map((d, i) =>
            i === 2 ? (
              <button key="mic" className="grid h-12 w-12 -translate-y-3 place-items-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 text-black shadow-[0_0_40px_-8px_rgba(250,204,21,0.7)]">
                <Mic className="h-5 w-5" />
              </button>
            ) : (
              <button key={i} className={`grid h-10 w-10 place-items-center ${i === 0 ? 'text-yellow-400' : 'text-zinc-500'}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d={d} /></svg>
              </button>
            ),
          )}
        </nav>
      </div>
    </div>
  );
}
