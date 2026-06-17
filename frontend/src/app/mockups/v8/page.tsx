'use client';

import { usuario, agenda, financeiro, metas, custo, brl } from '@/app/mockups/_data';

function Spark({ data, color = '#facc15' }: { data: number[]; color?: string }) {
  const w = 60, h = 22, min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / (max - min || 1)) * h}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-6">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Kpi({ titulo, valor, data, color }: { titulo: string; valor: string; data: number[]; color?: string }) {
  return (
    <div className="bg-neutral-900 rounded-2xl border border-white/5 p-3 shadow-lg">
      <p className="text-[11px] text-zinc-400">{titulo}</p>
      <p className="font-impact text-xl tracking-wide text-white mt-0.5 mb-1">{valor}</p>
      <Spark data={data} color={color} />
    </div>
  );
}

export default function PainelV8() {
  // Gráfico de área (saldo 7d)
  const s = financeiro.serie, W = 300, H = 90, mn = Math.min(...s), mx = Math.max(...s);
  const xy = (v: number, i: number) => ({ x: (i / (s.length - 1)) * W, y: H - ((v - mn) / (mx - mn || 1)) * H });
  const linha = s.map((v, i) => { const p = xy(v, i); return `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ');
  const area = `${linha} L${W},${H} L0,${H} Z`;

  // Donut custo por modelo
  const R = 34, C = 2 * Math.PI * R, cores = ['#facc15', '#fbbf24', '#52525b'];
  let off = 0;

  return (
    <div className="min-h-[100dvh] w-full bg-neutral-950 flex justify-center text-white">
      <div className="w-full max-w-[390px] px-4 pt-6 pb-28">
        {/* Header */}
        <header className="mb-5">
          <p className="text-xs text-zinc-400">{usuario.saudacao}, {usuario.nome}</p>
          <h1 className="font-impact text-3xl tracking-wide">Painel <span className="text-yellow-400">Nina</span></h1>
        </header>

        {/* KPIs */}
        <section className="grid grid-cols-2 gap-3 mb-4">
          <Kpi titulo="Saldo" valor={brl(financeiro.saldoCentavos)} data={financeiro.serie} />
          <Kpi titulo="Variação" valor={`+${financeiro.variacaoPct}%`} data={[1, 1.3, 1.1, 1.8, 1.6, 2, 2.4]} color="#34d399" />
          <Kpi titulo="Entradas" valor={brl(financeiro.entradasCentavos)} data={[8, 9, 7, 11, 10, 12, 12.5]} />
          <Kpi titulo="Saídas" valor={brl(financeiro.saidasCentavos)} data={[6, 7, 6.5, 8, 7.5, 8, 8.2]} color="#fb7185" />
        </section>

        {/* Área: saldo 7d */}
        <section className="bg-neutral-900 rounded-3xl border border-white/5 p-4 mb-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Saldo · 7 dias</p>
            <span className="text-xs text-yellow-400 font-medium">{brl(financeiro.saldoCentavos)}</span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24" preserveAspectRatio="none">
            <defs>
              <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#facc15" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#areaG)" />
            <path d={linha} fill="none" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </section>

        {/* Donut: custo por modelo */}
        <section className="bg-neutral-900 rounded-3xl border border-white/5 p-4 mb-4 shadow-lg">
          <p className="text-sm font-semibold mb-3">Custo IA · por modelo</p>
          <div className="flex items-center gap-4">
            <svg viewBox="0 0 88 88" className="w-24 h-24 -rotate-90 shrink-0">
              <circle cx="44" cy="44" r={R} fill="none" stroke="#27272a" strokeWidth="11" />
              {custo.porModelo.map((m, i) => {
                const len = (m.pct / 100) * C;
                const el = (
                  <circle key={m.modelo} cx="44" cy="44" r={R} fill="none" stroke={cores[i]} strokeWidth="11"
                    strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} />
                );
                off += len;
                return el;
              })}
            </svg>
            <ul className="flex-1 space-y-1.5">
              <li className="text-xs text-zinc-400">Total <span className="text-white font-semibold">US$ {custo.custoUsd.toFixed(2)}</span></li>
              {custo.porModelo.map((m, i) => (
                <li key={m.modelo} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cores[i] }} />
                  <span className="text-zinc-300 truncate flex-1">{m.modelo.split('/').pop()}</span>
                  <span className="text-zinc-500">{m.pct}%</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Metas */}
        <section className="bg-neutral-900 rounded-3xl border border-white/5 p-4 mb-4 shadow-lg">
          <p className="text-sm font-semibold mb-3">Metas</p>
          <ul className="space-y-3">
            {metas.map((m) => (
              <li key={m.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-300">{m.nome}</span>
                  <span className="text-zinc-500">{brl(m.atualCentavos)} / {brl(m.alvoCentavos)}</span>
                </div>
                <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-amber-500" style={{ width: `${m.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Hoje */}
        <section className="bg-neutral-900 rounded-2xl border border-white/5 p-4 flex items-center gap-3 shadow-lg">
          <div className="w-11 h-11 rounded-xl bg-yellow-400/10 flex flex-col items-center justify-center shrink-0">
            <span className="text-xs font-bold text-yellow-400">{agenda[0].hora.split(':')[0]}h</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-zinc-400">Hoje</p>
            <p className="text-sm font-medium truncate">{agenda[0].titulo}</p>
            <p className="text-xs text-zinc-500">{agenda[0].local}</p>
          </div>
        </section>
      </div>

      {/* FAB de voz flutuante */}
      <button aria-label="Falar com a Nina"
        className="fixed bottom-24 right-5 z-20 w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 shadow-xl shadow-amber-500/30 flex items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-yellow-400/40 animate-ping" />
        <svg viewBox="0 0 24 24" className="w-7 h-7 relative text-neutral-950" fill="currentColor">
          <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
          <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.93V21a1 1 0 1 0 2 0v-3.07A7 7 0 0 0 19 11Z" />
        </svg>
      </button>

      {/* Barra inferior fake */}
      <nav className="fixed bottom-0 inset-x-0 z-10 max-w-[390px] mx-auto bg-neutral-900/95 backdrop-blur border-t border-white/5">
        <div className="flex justify-around py-3">
          {[
            { on: true, d: 'M3 12l9-9 9 9M5 10v10h14V10' },
            { on: false, d: 'M8 2v4M16 2v4M3 10h18M5 6h14v14H5z' },
            { on: false, d: 'M4 6h16M4 12h16M4 18h10' },
            { on: false, d: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20a8 8 0 0 1 16 0' },
          ].map((it, i) => (
            <svg key={i} viewBox="0 0 24 24" className={`w-6 h-6 ${it.on ? 'text-yellow-400' : 'text-zinc-500'}`}
              fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={it.d} />
            </svg>
          ))}
        </div>
      </nav>
    </div>
  );
}
