'use client';

import { useEffect, useRef, useState } from 'react';
import { VoiceOrb } from '@/components/ui';
import { ninaMensagem, ninaVoz } from '@/lib/api';

type Status = 'idle' | 'listening' | 'thinking' | 'speaking';

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SRConstructor = new () => SpeechRecognitionLike;

const CHIPS = ['Anota um recado', 'O que tenho hoje?', 'Cria um lembrete', 'Paga uma conta'];

export default function FalarPage() {
  const [status, setStatus] = useState<Status>('idle');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [erro, setErro] = useState('');
  const [supported, setSupported] = useState(true);
  const [texto, setTexto] = useState('');
  const pendenteRef = useRef<Record<string, unknown> | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.lang = 'pt-BR';
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const t = e.results?.[0]?.[0]?.transcript ?? '';
      if (t) void enviar(t);
    };
    rec.onerror = () => setStatus('idle');
    rec.onend = () => setStatus((s) => (s === 'listening' ? 'idle' : s));
    recRef.current = rec;
    return () => {
      try { rec.stop(); } catch { /* noop */ }
      window.speechSynthesis?.cancel();
      audioRef.current?.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function falarNavegador(txt: string) {
    if (!window.speechSynthesis) { setStatus('idle'); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = 'pt-BR';
    u.onend = () => setStatus('idle');
    setStatus('speaking');
    window.speechSynthesis.speak(u);
  }

  // Voz da Nina = ElevenLabs (a MESMA do WhatsApp). Se a API não tiver a chave (503)
  // ou falhar, cai no TTS do navegador pra não ficar muda.
  async function falar(txt: string) {
    setStatus('speaking');
    try {
      const { audioBase64, mime } = await ninaVoz(txt);
      window.speechSynthesis?.cancel();
      audioRef.current?.pause();
      const audio = new Audio(`data:${mime};base64,${audioBase64}`);
      audioRef.current = audio;
      audio.onended = () => setStatus('idle');
      audio.onerror = () => falarNavegador(txt);
      await audio.play();
    } catch {
      falarNavegador(txt);
    }
  }

  async function enviar(msg: string) {
    setErro('');
    setTranscript(msg);
    setReply('');
    setStatus('thinking');
    try {
      const r = await ninaMensagem(msg, pendenteRef.current);
      pendenteRef.current = (r.pendente as Record<string, unknown> | null) ?? null;
      setReply(r.resposta);
      falar(r.resposta);
    } catch {
      setErro('Não consegui falar com a Nina agora. Tenta de novo?');
      setStatus('idle');
    }
  }

  function ouvir() {
    if (status === 'listening') { recRef.current?.stop(); setStatus('idle'); return; }
    if (status === 'thinking') return;
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    setTranscript('');
    setReply('');
    setErro('');
    try {
      recRef.current?.start();
      setStatus('listening');
    } catch {
      setStatus('idle');
    }
  }

  const legenda =
    status === 'listening' ? 'ouvindo…' :
    status === 'thinking' ? 'pensando…' :
    status === 'speaking' ? 'respondendo…' :
    'toque para falar';

  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-6 pb-28 pt-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(250,204,21,0.10),transparent_60%)]" />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6 text-center">
        <span className="inline-flex items-center gap-2 text-sm text-neutral-400">
          {status !== 'idle' && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-400" />
            </span>
          )}
          {legenda}
        </span>

        <button
          type="button"
          onClick={ouvir}
          disabled={!supported || status === 'thinking'}
          aria-label="Falar com a Nina"
          className="rounded-full outline-none transition active:scale-95 disabled:opacity-60"
        >
          <VoiceOrb size={208} />
        </button>

        <h1 className="text-xl font-extrabold uppercase tracking-wide text-white">
          {status === 'idle' ? <>Toque para falar com a <span className="text-yellow-400">Nina</span></> : <span className="text-yellow-400">{legenda}</span>}
        </h1>

        {transcript && (
          <p className="text-sm text-neutral-300">
            <span className="text-neutral-500">você:</span> “{transcript}”
          </p>
        )}
        {reply && (
          <div className="w-full rounded-2xl border border-white/5 bg-neutral-900 p-4 text-left">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-yellow-400">Nina</p>
            <p className="text-sm text-neutral-100">{reply}</p>
          </div>
        )}
        {erro && <p className="text-sm text-red-400">{erro}</p>}

        <div className="flex flex-wrap items-center justify-center gap-2">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => void enviar(chip)}
              disabled={status === 'thinking'}
              className="rounded-full border border-white/10 bg-neutral-900 px-4 py-2 text-sm text-neutral-200 hover:border-yellow-400/40 disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Fallback de texto (e p/ navegadores sem reconhecimento de voz) */}
        <form
          onSubmit={(e) => { e.preventDefault(); if (texto.trim()) { void enviar(texto.trim()); setTexto(''); } }}
          className="flex w-full items-center gap-2"
        >
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={supported ? 'ou digite aqui…' : 'seu navegador não captura voz — digite aqui'}
            className="flex-1 rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-yellow-400/60"
          />
          <button type="submit" disabled={status === 'thinking' || !texto.trim()}
            className="rounded-xl bg-gradient-to-br from-yellow-300 to-amber-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-50">
            Enviar
          </button>
        </form>

        <p className="max-w-xs text-center text-xs text-neutral-500">
          Dica: peça “anota…”, “cria um lembrete…”, “paga a conta de…”. Ações financeiras pedem confirmação (responda “sim”).
        </p>
      </div>
    </div>
  );
}
