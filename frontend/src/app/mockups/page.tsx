import Link from 'next/link';

const VARIANTS = [
  { href: '/mockups/v6', n: '06', nome: 'Híbrido · Equilíbrio', desc: 'v2+v4+v5: saldo + orbe + sparklines + área. Recomendado.' },
  { href: '/mockups/v7', n: '07', nome: 'Híbrido · Voz-first', desc: 'Orbe protagonista + cards noir de resumo.' },
  { href: '/mockups/v8', n: '08', nome: 'Híbrido · Dados-first', desc: 'KPIs + área + donut + FAB de voz. Analítico.' },
  { href: '/mockups/v9', n: '09', nome: 'Híbrido · Editorial Noir', desc: 'Tipografia marcante + glow âmbar. Sofisticado.' },
  { href: '/mockups/v1', n: '01', nome: 'Brutalist Bold', desc: 'Blocos amarelos, tipografia gigante. Ousado.' },
  { href: '/mockups/v2', n: '02', nome: 'Noir Premium Fintech', desc: 'Cards escuros, saldo com glow amarelo.' },
  { href: '/mockups/v3', n: '03', nome: 'Minimal Mono', desc: 'Preto/branco, um acento amarelo. Discreto.' },
  { href: '/mockups/v4', n: '04', nome: 'Voice Orb', desc: 'Orbe de voz animado, waveform.' },
  { href: '/mockups/v5', n: '05', nome: 'Data Cockpit', desc: 'KPIs, área e donut em SVG.' },
];

export default function MockupsIndex() {
  return (
    <main className="min-h-[100dvh] bg-black px-5 py-10 text-white">
      <div className="mx-auto max-w-md">
        <p className="font-mono text-xs uppercase tracking-widest text-yellow-400">Nina · Design</p>
        <h1 className="mt-2 text-3xl font-bold">5 direções visuais</h1>
        <p className="mt-2 text-sm text-zinc-400">Tema preto + amarelo. Abra cada uma no celular e escolha.</p>
        <div className="mt-8 space-y-3">
          {VARIANTS.map((v) => (
            <Link
              key={v.href}
              href={v.href}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-zinc-900 p-4 transition-colors hover:border-yellow-400/50"
            >
              <span className="font-mono text-lg font-bold text-yellow-400">{v.n}</span>
              <span className="flex-1">
                <span className="block font-semibold">{v.nome}</span>
                <span className="block text-xs text-zinc-400">{v.desc}</span>
              </span>
              <span className="text-yellow-400">→</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
