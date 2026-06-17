// UI kit — tema dark premium (preto + amarelo, fonte Archivo).
// Componentes presentacionais reutilizados pelas telas da Nina.

import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-white/5 bg-neutral-900 p-4 shadow-lg shadow-black/30 ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{children}</h2>
      {right ? <span className="text-xs text-neutral-500">{right}</span> : null}
    </div>
  );
}

type Tone = 'yellow' | 'zinc' | 'amber' | 'emerald' | 'red';
const TONES: Record<Tone, string> = {
  yellow: 'bg-yellow-400/15 text-yellow-300',
  zinc: 'bg-white/5 text-neutral-300',
  amber: 'bg-amber-400/15 text-amber-300',
  emerald: 'bg-emerald-400/15 text-emerald-300',
  red: 'bg-red-400/15 text-red-300',
};

export function Pill({ children, tone = 'zinc' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function Progress({ pct, color = 'from-yellow-300 to-amber-500' }: { pct: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
      <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

export function Spark({ serie, color = '#facc15' }: { serie: number[]; color?: string }) {
  if (!serie.length) return null;
  const W = 64, H = 22, min = Math.min(...serie), max = Math.max(...serie);
  const pts = serie.map((v, i) => `${(i / (serie.length - 1 || 1)) * W},${H - ((v - min) / (max - min || 1)) * H}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-6 w-full">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StatTile({ label, value, serie, color = '#facc15' }: { label: string; value: string; serie?: number[]; color?: string }) {
  return (
    <Card className="!p-3">
      <p className="text-[11px] text-neutral-400">{label}</p>
      <p className="mt-0.5 text-lg font-extrabold tracking-tight text-white">{value}</p>
      {serie && serie.length > 1 ? <div className="mt-1"><Spark serie={serie} color={color} /></div> : null}
    </Card>
  );
}

export function AreaChartSvg({ serie, className = '' }: { serie: number[]; className?: string }) {
  const W = 300, H = 96;
  if (serie.length < 2) return <div className={`h-24 ${className}`} />;
  const min = Math.min(...serie), max = Math.max(...serie);
  const coords = serie.map((v, i) => ({ x: (i / (serie.length - 1)) * W, y: H - ((v - min) / (max - min || 1)) * (H - 8) - 4 }));
  const line = coords.map((c, i) => `${i ? 'L' : 'M'}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`w-full ${className}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="ninaArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#facc15" stopOpacity={0.45} />
          <stop offset="100%" stopColor="#facc15" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#ninaArea)" />
      <path d={line} fill="none" stroke="#facc15" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export type Segmento = { label: string; pct: number; valor?: string; color: string };

export function Donut({ segments, centerLabel, centerValue }: { segments: Segmento[]; centerLabel?: string; centerValue?: string }) {
  const R = 34, C = 2 * Math.PI * R;
  let off = 0;
  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <svg viewBox="0 0 88 88" className="h-24 w-24 -rotate-90">
          <circle cx="44" cy="44" r={R} fill="none" stroke="#27272a" strokeWidth={11} />
          {segments.map((s) => {
            const len = (s.pct / 100) * C;
            const el = (
              <circle key={s.label} cx="44" cy="44" r={R} fill="none" stroke={s.color} strokeWidth={11} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} strokeLinecap="butt" />
            );
            off += len;
            return el;
          })}
        </svg>
        {(centerValue || centerLabel) && (
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              {centerValue ? <p className="text-sm font-extrabold text-white">{centerValue}</p> : null}
              {centerLabel ? <p className="text-[9px] uppercase tracking-wide text-neutral-500">{centerLabel}</p> : null}
            </div>
          </div>
        )}
      </div>
      <ul className="flex-1 space-y-1.5">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="flex-1 truncate text-neutral-300">{s.label}</span>
            <span className="text-neutral-500">{s.valor ?? `${s.pct}%`}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MicIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
      <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 1 0 2 0v-3.08A7 7 0 0 0 19 11Z" />
    </svg>
  );
}

export function VoiceOrb({ size = 128 }: { size?: number }) {
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full border border-yellow-400/20" style={{ animationDuration: '3s' }} />
      <span className="absolute rounded-full border border-yellow-400/30" style={{ width: size * 0.8, height: size * 0.8 }} />
      <span className="absolute rounded-full bg-yellow-500/30 blur-2xl" style={{ width: size * 0.75, height: size * 0.75 }} />
      <span className="relative grid place-items-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 text-black shadow-[0_0_70px_-10px_rgba(250,204,21,0.6)]" style={{ width: size * 0.62, height: size * 0.62 }}>
        <MicIcon className="h-[38%] w-[38%]" />
      </span>
    </div>
  );
}

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return <p className="py-6 text-center text-sm text-neutral-500">{label}</p>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-neutral-500">{children}</p>;
}

export function PageHeader({ titulo, sub }: { titulo: string; sub?: string }) {
  return (
    <header className="mb-5">
      <h1 className="text-3xl font-extrabold tracking-tight text-white">{titulo}</h1>
      {sub ? <p className="mt-1 text-sm text-neutral-400">{sub}</p> : null}
    </header>
  );
}
