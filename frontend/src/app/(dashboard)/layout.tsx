'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearToken, getToken } from '@/lib/auth';

const NAV = [
  { href: '/', label: 'Início' },
  { href: '/agenda', label: 'Agenda' },
  { href: '/aguardando', label: 'Aguardando' },
  { href: '/financeiro', label: 'Financeiro' },
  { href: '/pe-de-meia', label: 'Pé de meia' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) return null;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
      <header className="flex items-center justify-between px-4 py-4">
        <span className="text-xl font-bold text-nina-700">Nina</span>
        <button
          onClick={() => {
            clearToken();
            router.replace('/login');
          }}
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          Sair
        </button>
      </header>
      <main className="flex-1 px-4 pb-24">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-2xl justify-around border-t border-slate-200 bg-white py-2">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`rounded-lg px-4 py-1 text-sm font-medium ${
              pathname === n.href ? 'text-nina-600' : 'text-slate-500'
            }`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
