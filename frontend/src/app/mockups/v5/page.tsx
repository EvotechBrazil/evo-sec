'use client';

import { usuario, agenda, recados, aguardando, financeiro, metas, custo, brl } from '@/app/mockups/_data';

// silencia imports não usados sem quebrar a assinatura pedida
void usuario; void agenda; void recados; void aguardando;

const W = 320;
const H = 96;

function buildPaths(serie: number[]) {
  const min = Math.min(...serie);
  const max = Math.max(...serie);
  const span = max - min || 1;
  const pts = serie.map((v, i) => {
    const x = (i / (serie.length - 1)) * W;
    const y = H - ((v - min) / span) * (H - 10) - 4;
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  return { line, area, pts };
}

function Sparkline({ serie, up }: { serie: number[]; up: boolean }) {
  const min = Math.min(...serie);
  const max = Math.max(...serie);
  const span = max - min || 1;
  const d = serie
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (serie.length - 1)) * 48},${16 - ((v - min) / span) * 14}`)
    .join(' ');
  return (
    <svg viewBox="0 0 48 16" className="h-4 w-12">
      <path d={d} fill="none" stroke={up ? '#facc15' : '#71717a'} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Kpi({ label, valor, serie, up }: { label: string; valor: string; serie: number[]; up: boolean }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-neutral-900 p-3">
      <div className="flex items-start justify-between">
        <span className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</span>
        <Sparkline serie={serie} up={up} />
      </div>
      <div className="mt-2 text-lg font-bold tabular-nums text-white">{valor}</div>
    </div>
  );
}

export default function PainelDataCockpit() {
  const { line, area, pts } = buildPaths(financeiro.serie);
  const r = 30;
  const circ = 2 * Math.PI * r;
  const cores = ['#facc15', '#fde047', '#a16207'];
  let acc = 0;

  return (
    <div className="min-h-[100dvh] w-full bg-neutral-950 text-white">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[390px] flex-col px-4 pb-24 pt-6">
        {/* Header */}
        <header className="mb-4 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Painel</h1>
            <p className="text-xs text-neutral-500">Visão analítica · Nina</p>
          </div>
          <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-[11px] font-medium text-yellow-400">
            Últimos 7 dias
          </span>
        </header>

        {/* KPIs */}
        <section className="grid grid-cols-2 gap-2">
          <Kpi label="Saldo" valor={brl(financeiro.saldoCentavos)} serie={financeiro.serie} up />
          <Kpi label="Variação" valor={`+${financeiro.variacaoPct}%`} serie={financeiro.serie} up />
          <Kpi label="Entradas" valor={brl(financeiro.entradasCentavos)} serie={[1, 3, 2, 4, 3, 5, 6]} up />
          <Kpi label="Saídas" valor={brl(financeiro.saidasCentavos)} serie={[6, 5, 5, 3, 4, 2, 3]} up={false} />
        </section>

        {/* Área: saldo 7 dias */}
        <section className="mt-3 rounded-2xl border border-white/5 bg-neutral-900 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-300">Saldo · 7 dias</span>
            <span className="text-[11px] font-semibold text-yellow-400">{brl(financeiro.saldoCentavos)}</span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#facc15" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((g) => (
              <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="#ffffff" strokeOpacity="0.04" strokeWidth="1" />
            ))}
            <path d={area} fill="url(#g)" />
            <path d={line} fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="2" fill="#facc15" />
            ))}
          </svg>
        </section>

        {/* Donut: custo por modelo */}
        <section className="mt-3 rounded-2xl border border-white/5 bg-neutral-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-300">Custo por modelo</span>
            <span className="text-[11px] text-neutral-500">{custo.tokensIn.toLocaleString('pt-BR')} tok in</span>
          </div>
          <div className="flex items-center gap-4">
            <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
              <circle cx="40" cy="40" r={r} fill="none" stroke="#27272a" strokeWidth="10" />
              {custo.porModelo.map((m, i) => {
                const dash = (m.pct / 100) * circ;
                const seg = (
                  <circle
                    key={m.modelo}
                    cx="40"
                    cy="40"
                    r={r}
                    fill="none"
                    stroke={cores[i]}
                    strokeWidth="10"
                    strokeDasharray={`${dash} ${circ - dash}`}
                    strokeDashoffset={-acc}
                  />
                );
                acc += dash;
                return seg;
              })}
            </svg>
            <div className="flex-1 space-y-2">
              <div className="text-xl font-bold text-yellow-400">${custo.custoUsd.toFixed(2)}</div>
              {custo.porModelo.map((m, i) => (
                <div key={m.modelo} className="flex items-center gap-2 text-[11px]">
                  <span className="h-2 w-2 rounded-full" style={{ background: cores[i] }} />
                  <span className="flex-1 truncate text-neutral-400">{m.modelo}</span>
                  <span className="tabular-nums text-neutral-300">{m.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Metas */}
        <section className="mt-3 rounded-2xl border border-white/5 bg-neutral-900 p-4">
          <span className="text-xs font-medium text-neutral-300">Metas</span>
          <div className="mt-3 space-y-3">
            {metas.map((m) => (
              <div key={m.id}>
                <div className="mb-1 flex justify-between text-[11px]">
                  <span className="text-neutral-400">{m.nome}</span>
                  <span className="tabular-nums text-yellow-400">{m.pct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                  <div className="h-full rounded-full bg-yellow-400" style={{ width: `${m.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Barra inferior */}
      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-[390px] border-t border-white/5 bg-neutral-950/95 px-6 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          {[
            { d: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm8 0h8v-9h-8v9Zm0-16v5h8V4h-8Z', on: true },
            { d: 'M12 2 2 7l10 5 10-5-10-5Zm0 7L2 14l10 5 10-5', on: false },
            { d: 'M12 8v8m-4-4h8M4 4h16v16H4z', on: false },
            { d: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0', on: false },
          ].map((ic, i) => (
            <svg key={i} viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke={ic.on ? '#facc15' : '#52525b'} strokeWidth="1.8">
              <path d={ic.d} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ))}
        </div>
      </nav>
    </div>
  );
}
