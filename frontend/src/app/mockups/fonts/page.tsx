import { financeiro, brl } from '@/app/mockups/_data';

const FONTES = [
  { id: 'bebas', nome: 'Bebas Neue', ref: '≈ The Cons (condensada display)', varName: 'var(--font-bebas)', upper: true },
  { id: 'oswald', nome: 'Oswald', ref: '≈ The Cons / business (condensada elegante)', varName: 'var(--font-oswald)', upper: false },
  { id: 'anton', nome: 'Anton', ref: '≈ Impact (atual, pesada condensada)', varName: 'var(--font-anton)', upper: false },
  { id: 'archivo', nome: 'Archivo', ref: '≈ Cash Flow (grotesque business)', varName: 'var(--font-archivo)', upper: false },
  { id: 'space', nome: 'Space Grotesk', ref: '≈ Lequire (logo moderno / tech)', varName: 'var(--font-space)', upper: false },
  { id: 'sora', nome: 'Sora', ref: '≈ Bagipay (fintech geométrica)', varName: 'var(--font-sora)', upper: false },
];

function Spark({ color = '#facc15' }: { color?: string }) {
  const data = financeiro.serie;
  const w = 60, h = 22, min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / (max - min || 1)) * h}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-6 w-full">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function FontsSpecimen() {
  return (
    <main className="min-h-[100dvh] bg-neutral-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-[390px]">
        <p className="font-mono text-xs uppercase tracking-widest text-yellow-400">Nina · Tipografia</p>
        <h1 className="mt-1 text-2xl font-bold">Painel (v8) em 6 fontes</h1>
        <p className="mt-1 text-sm text-zinc-400">Equivalentes gratuitos (Google Fonts) das referências do Envato. Escolha pelo número.</p>

        <div className="mt-6 space-y-5">
          {FONTES.map((f, idx) => (
            <section key={f.id} className="rounded-3xl border border-white/5 bg-neutral-900 p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="font-mono text-xs text-yellow-400">{String(idx + 1).padStart(2, '0')} · {f.nome}</span>
                <span className="text-[11px] text-zinc-500">{f.ref}</span>
              </div>

              {/* título */}
              <h2
                className="leading-none"
                style={{ fontFamily: f.varName, fontSize: '30px', textTransform: f.upper ? 'uppercase' : 'none', letterSpacing: f.upper ? '0.02em' : '0' }}
              >
                Painel <span className="text-yellow-400">Nina</span>
              </h2>

              {/* número grande */}
              <p
                className="mt-3 leading-none text-white"
                style={{ fontFamily: f.varName, fontSize: '40px', textTransform: f.upper ? 'uppercase' : 'none' }}
              >
                {brl(financeiro.saldoCentavos)}
              </p>

              {/* mini KPIs */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/5 bg-neutral-950 p-3">
                  <p className="text-[11px] text-zinc-400">Entradas</p>
                  <p className="text-white" style={{ fontFamily: f.varName, fontSize: '20px' }}>{brl(financeiro.entradasCentavos)}</p>
                  <Spark />
                </div>
                <div className="rounded-2xl border border-white/5 bg-neutral-950 p-3">
                  <p className="text-[11px] text-zinc-400">Variação</p>
                  <p className="text-yellow-400" style={{ fontFamily: f.varName, fontSize: '20px' }}>+{financeiro.variacaoPct}%</p>
                  <Spark color="#34d399" />
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
