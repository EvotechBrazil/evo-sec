'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearToken, getToken } from '@/lib/auth';
import { MicIcon } from '@/components/ui';

type IconProps = { className?: string };
const Icons = {
  inicio: (p: IconProps) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M3 9.5 12 3l9 6.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-6h6v6" /></svg>),
  agenda: (p: IconProps) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={p.className}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>),
  espera: (p: IconProps) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>),
  financeiro: (p: IconProps) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={p.className}><rect x="2" y="6" width="20" height="13" rx="2" /><path d="M2 10h20M16 15h2" /></svg>),
  pedemeia: (p: IconProps) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M19 9a5 5 0 0 0-5-5H9a6 6 0 0 0-6 6 6 6 0 0 0 3 5.2V19h3v-2h3v2h3v-3a5 5 0 0 0 2-4Z" /><path d="M16 9h.01" /></svg>),
  custo: (p: IconProps) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M4 19V5m5 14V9m5 10V7m5 12V11" /></svg>),
};

const NAV = [
  { href: '/', label: 'Início', icon: Icons.inicio },
  { href: '/agenda', label: 'Agenda', icon: Icons.agenda },
  { href: '/aguardando', label: 'Espera', icon: Icons.espera },
  { href: '/financeiro', label: 'Finanças', icon: Icons.financeiro },
  { href: '/pe-de-meia', label: 'Pé-meia', icon: Icons.pedemeia },
  { href: '/custo', label: 'Custo', icon: Icons.custo },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) router.replace('/login');
    else setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <div className="relative mx-auto flex min-h-[100dvh] max-w-2xl flex-col bg-neutral-950">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-neutral-950/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-yellow-300 to-amber-500 text-sm font-black text-black">N</span>
          <span className="text-lg font-extrabold tracking-tight text-white">Nina</span>
        </div>
        <button
          onClick={() => { clearToken(); router.replace('/login'); }}
          className="rounded-lg px-2 py-1 text-sm text-neutral-400 hover:bg-white/5 hover:text-white"
        >
          Sair
        </button>
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

      {/* FAB de voz → Falar com a Nina (oculto na própria tela de voz) */}
      {pathname !== '/falar' && (
        <Link
          href="/falar"
          aria-label="Falar com a Nina"
          className="fixed bottom-24 right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 text-black shadow-[0_0_40px_-8px_rgba(250,204,21,0.7)] active:scale-95"
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-yellow-400/30" />
          <MicIcon className="relative h-6 w-6" />
        </Link>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-2xl border-t border-white/5 bg-neutral-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="grid grid-cols-6">
          {NAV.map((n) => {
            const active = pathname === n.href;
            const Icon = n.icon;
            return (
              <Link key={n.href} href={n.href} aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors ${active ? 'text-yellow-400' : 'text-neutral-500 hover:text-neutral-300'}`}>
                <span className={`grid h-8 w-8 place-items-center rounded-xl transition-colors ${active ? 'bg-yellow-400/10' : ''}`}>
                  <Icon className="h-5 w-5" />
                </span>
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
