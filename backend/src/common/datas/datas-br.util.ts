/**
 * Datas no fuso de São Paulo (SPEC-007). Brasil é UTC-3 fixo (sem horário de
 * verão desde 2019); o wall-clock é derivado via Intl (timezone real) e
 * anexado com offset `-03:00` — evita o off-by-one que vinha de datas em UTC
 * (ex.: o LLM emitia `2026-07-30T00:00:00Z`, que no fuso BR exibia 29/07).
 */
const TZ = 'America/Sao_Paulo';
const OFFSET = '-03:00';

interface PartesData {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
}

function partesSP(d: Date): PartesData {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const m: Record<string, string> = {};
  for (const p of f.formatToParts(d)) if (p.type !== 'literal') m[p.type] = p.value;
  // Intl pode devolver "24" para meia-noite — normaliza para "00".
  const hour = m.hour === '24' ? '00' : m.hour;
  return { year: m.year, month: m.month, day: m.day, hour, minute: m.minute, second: m.second };
}

/** Agora em São Paulo, ISO com offset `-03:00` (ex.: `2026-06-24T10:41:55-03:00`). */
export function agoraSaoPaulo(now: Date = new Date()): string {
  const p = partesSP(now);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${OFFSET}`;
}

/**
 * Ancora uma data emitida pelo LLM ao fuso BR, evitando off-by-one:
 * - date-only `YYYY-MM-DD` → `...T00:00:00-03:00`
 * - já com offset explícito (`±HH:MM`) → mantém intacta (foi emitida certo)
 * - `Z`/UTC ou sem zona → reexpressa o mesmo wall-clock com `-03:00` (preserva o dia)
 * Retorna `undefined` para entrada vazia/inválida (o chamador decide perguntar).
 */
export function ancorarDataBR(iso?: string | null): string | undefined {
  const s = (iso ?? '').trim();
  if (!s) return undefined;
  // date-only → meia-noite BR
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00${OFFSET}`;
  // já tem offset ±HH:MM → confia no que o LLM emitiu
  if (/[+-]\d{2}:\d{2}$/.test(s)) return s;
  // tem hora mas em Z/UTC (ou sem zona): pega o wall-clock e anexa -03:00 (mesmo dia)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    const [, y, mo, d, hh, mi, ss] = m;
    return `${y}-${mo}-${d}T${hh}:${mi}:${ss ?? '00'}${OFFSET}`;
  }
  // não reconheceu o formato — devolve como veio (não piora)
  return s;
}
