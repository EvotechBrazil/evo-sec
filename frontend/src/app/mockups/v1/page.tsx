'use client';

import { usuario, agenda, recados, aguardando, financeiro, metas, custo, brl } from '@/app/mockups/_data';

const tags: Record<string, string> = {
  ALTA: 'bg-black text-yellow-300',
  NORMAL: 'bg-yellow-300 text-black',
  BAIXA: 'bg-yellow-300/40 text-black',
};

export default function MockupV1() {
  const max = Math.max(...financeiro.serie);
  return (
    <div className="min-h-[100dvh] bg-black text-yellow-300 font-sans">
      <div className="mx-auto w-full max-w-[430px] px-4 pb-28 pt-6">
        {/* HEADER */}
        <header className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-yellow-300/60">{usuario.saudacao}</p>
            <h1 className="text-4xl font-black uppercase leading-none tracking-tight">{usuario.nome}</h1>
          </div>
          <div className="flex h-14 w-14 items-center justify-center border-4 border-yellow-300 bg-yellow-300 text-2xl font-black text-black shadow-[4px_4px_0_0_#facc15]">
            {usuario.nome.charAt(0)}
          </div>
        </header>

        {/* HERO SALDO */}
        <section className="mt-6 border-4 border-yellow-300 bg-yellow-300 p-5 text-black shadow-[6px_6px_0_0_#facc15]">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em]">Saldo atual</p>
          <div className="mt-1 flex items-end justify-between">
            <p className="text-5xl font-black leading-none tracking-tighter">{brl(financeiro.saldoCentavos)}</p>
            <span className="border-2 border-black bg-black px-2 py-1 font-mono text-xs font-bold text-yellow-300">
              ▲ {financeiro.variacaoPct}%
            </span>
          </div>
          <div className="mt-4 flex items-end gap-1">
            {financeiro.serie.map((v, i) => (
              <div key={i} className="flex-1 border-2 border-black bg-black" style={{ height: `${20 + (v / max) * 44}px` }} />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px] font-bold uppercase">
            <p>+ {brl(financeiro.entradasCentavos)}<br /><span className="text-black/50">entradas</span></p>
            <p className="text-right">- {brl(financeiro.saidasCentavos)}<br /><span className="text-black/50">saídas</span></p>
          </div>
        </section>

        {/* AÇÕES RÁPIDAS */}
        <section className="mt-5 flex flex-wrap gap-2">
          {['Falar com a Nina', 'Nova tarefa', 'Pagar conta', 'Ver agenda'].map((a, i) => (
            <button
              key={a}
              className={`border-2 border-yellow-300 px-3 py-2 font-mono text-xs font-bold uppercase shadow-[3px_3px_0_0_#facc15] ${
                i === 0 ? 'bg-yellow-300 text-black' : 'bg-black text-yellow-300'
              }`}
            >
              {a}
            </button>
          ))}
        </section>

        {/* AGENDA */}
        <section className="mt-6">
          <h2 className="mb-2 text-2xl font-black uppercase tracking-tight">Hoje</h2>
          <ul className="space-y-2">
            {agenda.map((e) => (
              <li key={e.id} className="flex items-center gap-3 border-2 border-yellow-300 bg-black p-3 shadow-[3px_3px_0_0_#facc15]">
                <span className="border-2 border-yellow-300 bg-yellow-300 px-2 py-1 font-mono text-sm font-black text-black">{e.hora}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold uppercase">{e.titulo}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-yellow-300/60">{e.local} · {e.tag}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* RECADOS */}
        <section className="mt-6">
          <h2 className="mb-2 text-2xl font-black uppercase tracking-tight">Recados</h2>
          <ul className="space-y-2">
            {recados.map((r) => (
              <li key={r.id} className="border-l-8 border-yellow-300 bg-yellow-300/10 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold leading-snug text-yellow-50">{r.conteudo}</p>
                  <span className={`shrink-0 px-2 py-0.5 font-mono text-[9px] font-black uppercase ${tags[r.prioridade]}`}>{r.prioridade}</span>
                </div>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-yellow-300/50">
                  {r.remetente ?? 'sem remetente'} · {r.categoria}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* AGUARDANDO + METAS */}
        <section className="mt-6 grid grid-cols-2 gap-3">
          <div className="border-2 border-yellow-300 bg-black p-3 shadow-[3px_3px_0_0_#facc15]">
            <p className="font-mono text-[10px] uppercase tracking-widest text-yellow-300/60">Aguardando</p>
            <ul className="mt-2 space-y-2">
              {aguardando.map((a) => (
                <li key={a.id} className="text-xs font-bold uppercase leading-tight">
                  {a.titulo}
                  <span className="block font-mono text-[9px] text-yellow-300/50">{a.de} · {a.prazo}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-2 border-yellow-300 bg-black p-3 shadow-[3px_3px_0_0_#facc15]">
            <p className="font-mono text-[10px] uppercase tracking-widest text-yellow-300/60">Metas</p>
            <ul className="mt-2 space-y-2">
              {metas.map((m) => (
                <li key={m.id}>
                  <p className="truncate text-[11px] font-bold uppercase">{m.nome}</p>
                  <div className="mt-1 h-2 w-full border border-yellow-300 bg-black">
                    <div className="h-full bg-yellow-300" style={{ width: `${m.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CUSTO NINA */}
        <section className="mt-3 flex items-center justify-between border-2 border-yellow-300 bg-yellow-300 p-3 text-black shadow-[3px_3px_0_0_#facc15]">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest">Custo da Nina (mês)</p>
          <p className="font-mono text-xl font-black">US$ {custo.custoUsd.toFixed(2)}</p>
        </section>
      </div>

      {/* BOTTOM NAV */}
      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-[430px] items-center justify-around border-t-4 border-yellow-300 bg-black px-2 py-3">
        {[
          { d: 'M3 12l9-9 9 9M5 10v10h14V10', on: true },
          { d: 'M8 7V3m8 4V3M4 11h16M5 7h14v13H5z' },
          { d: 'M12 2v20M2 12h20' },
          { d: 'M4 6h16M4 12h16M4 18h10' },
          { d: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0' },
        ].map((ic, i) => (
          <button key={i} className={`flex h-11 w-11 items-center justify-center ${ic.on ? 'bg-yellow-300 text-black' : 'text-yellow-300'}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <path d={ic.d} />
            </svg>
          </button>
        ))}
      </nav>
    </div>
  );
}
