'use client';

import { useState } from 'react';
import { changePassword } from '@/lib/api';
import { PageHeader } from '@/components/ui';

export default function ConfiguracoesPage() {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (novaSenha.length < 6) {
      setMsg({ tipo: 'erro', texto: 'A nova senha precisa ter ao menos 6 caracteres.' });
      return;
    }
    if (novaSenha !== confirma) {
      setMsg({ tipo: 'erro', texto: 'A confirmação não bate com a nova senha.' });
      return;
    }
    setLoading(true);
    try {
      await changePassword(senhaAtual, novaSenha);
      setMsg({ tipo: 'ok', texto: 'Senha alterada com sucesso.' });
      setSenhaAtual('');
      setNovaSenha('');
      setConfirma('');
    } catch (e: unknown) {
      const resp = (e as { response?: { data?: { message?: string | string[] } } })?.response;
      const m = resp?.data?.message;
      const texto = Array.isArray(m) ? m.join(' ') : m || 'Não foi possível alterar. Confira a senha atual.';
      setMsg({ tipo: 'erro', texto });
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    'mt-1 w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-white outline-none placeholder:text-neutral-600 focus:border-yellow-400/60';

  return (
    <div>
      <PageHeader titulo="Configurações" sub="Sua conta" />
      <form onSubmit={handleSubmit} className="mt-2 rounded-2xl border border-white/5 bg-neutral-900 p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-neutral-400">Trocar senha</h2>
        <label className="mb-3 block text-sm font-medium text-neutral-300">
          Senha atual
          <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} required className={inputCls} />
        </label>
        <label className="mb-3 block text-sm font-medium text-neutral-300">
          Nova senha
          <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required minLength={6} className={inputCls} />
        </label>
        <label className="mb-4 block text-sm font-medium text-neutral-300">
          Confirmar nova senha
          <input type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} required className={inputCls} />
        </label>
        {msg && (
          <p className={`mb-3 text-sm ${msg.tipo === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{msg.texto}</p>
        )}
        <button type="submit" disabled={loading}
          className="w-full rounded-xl bg-gradient-to-br from-yellow-300 to-amber-500 py-2.5 font-bold text-black transition active:scale-[0.99] disabled:opacity-60">
          {loading ? 'Salvando…' : 'Salvar nova senha'}
        </button>
      </form>
    </div>
  );
}
