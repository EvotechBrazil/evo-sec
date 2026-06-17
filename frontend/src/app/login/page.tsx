'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { login } from '@/lib/api';
import { setToken } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      const token = await login(email, password);
      setToken(token);
      router.push('/');
    } catch {
      setErro('Credenciais inválidas.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-neutral-950 p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_25%,rgba(250,204,21,0.12),transparent_60%)]" />
      <form onSubmit={handleSubmit} className="relative w-full max-w-sm rounded-3xl border border-white/5 bg-neutral-900 p-8 shadow-xl shadow-black/40">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-yellow-300 to-amber-500 text-lg font-black text-black">N</span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Nina</h1>
            <p className="text-sm text-neutral-400">Sua secretária pessoal</p>
          </div>
        </div>
        <label className="mb-3 block text-sm font-medium text-neutral-300">
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="mt-1 w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-white outline-none placeholder:text-neutral-600 focus:border-yellow-400/60" />
        </label>
        <label className="mb-5 block text-sm font-medium text-neutral-300">
          Senha
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="mt-1 w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-white outline-none placeholder:text-neutral-600 focus:border-yellow-400/60" />
        </label>
        {erro && <p className="mb-3 text-sm text-red-400">{erro}</p>}
        <button type="submit" disabled={loading}
          className="w-full rounded-xl bg-gradient-to-br from-yellow-300 to-amber-500 py-2.5 font-bold text-black transition active:scale-[0.99] disabled:opacity-60">
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
