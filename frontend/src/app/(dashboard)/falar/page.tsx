'use client';

import { useQuery } from '@tanstack/react-query';
import { VoiceOrb } from '@/components/ui';
import { fetchAgenda, fetchRecados } from '@/lib/api';

const BARRAS = [14, 26, 40, 22, 34, 52, 30, 60, 38, 48, 24, 42, 18, 32, 16];

const CHIPS = ['Anotar recado', 'Minha agenda', 'Finanças', 'Lembretes'];

export default function FalarPage() {
  const { data: agenda } = useQuery({ queryKey: ['agenda'], queryFn: fetchAgenda });
  const { data: recados } = useQuery({ queryKey: ['recados'], queryFn: fetchRecados });

  const totalAgenda = agenda?.length ?? 0;
  const totalRecados = recados?.length ?? 0;

  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-6 pb-28 pt-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(250,204,21,0.10),transparent_60%)]" />

      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        <div className="flex flex-col items-center gap-1">
          <p className="text-lg font-semibold text-white">Boa tarde, Tiago</p>
          <span className="inline-flex items-center gap-2 text-sm text-neutral-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-400" />
            </span>
            ouvindo...
          </span>
        </div>

        <VoiceOrb size={208} />

        <h1 className="text-xl font-extrabold uppercase tracking-wide text-white">
          Toque para falar com a <span className="text-yellow-400">Nina</span>
        </h1>

        <div className="flex h-16 items-end gap-1.5" aria-hidden>
          {BARRAS.map((altura, i) => (
            <span
              key={i}
              className="w-1.5 rounded-full bg-gradient-to-t from-amber-500 to-yellow-300 animate-pulse"
              style={{ height: altura, animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>

        <p className="text-sm text-neutral-300">
          Você tem <span className="font-semibold text-yellow-400">{totalAgenda}</span> compromissos e{' '}
          <span className="font-semibold text-yellow-400">{totalRecados}</span> recados hoje
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {CHIPS.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-white/10 bg-neutral-900 px-4 py-2 text-sm text-neutral-200"
            >
              {chip}
            </span>
          ))}
        </div>

        <p className="max-w-xs text-center text-xs text-neutral-500">
          A conversa por voz acontece no WhatsApp — diga &quot;nina&quot; para abrir a sessão.
        </p>
      </div>
    </div>
  );
}
