/**
 * Helpers de formatação para os digests da Nina (SPEC-002).
 * Funções puras (sem I/O, sem tenant) — fáceis de testar.
 * Sparkline / seta / moeda inspirados na skill `relatorio-diario` (Bravy),
 * portados para TS. Datas são tz-aware (Brasil = UTC-3 fixo desde 2019, mas
 * resolvido genericamente via Intl para qualquer `timezone` do tenant).
 */

const BLOCOS = '▁▂▃▄▅▆▇█';

/** Curva compacta em blocos unicode. Vazio/uniforme tratado sem dividir por zero. */
export function sparkline(valores: number[]): string {
  if (valores.length === 0) return '';
  const vmin = Math.min(...valores);
  const vmax = Math.max(...valores);
  if (vmax === vmin) return BLOCOS[3].repeat(valores.length);
  return valores
    .map((v) => {
      const idx = Math.round(((v - vmin) / (vmax - vmin)) * (BLOCOS.length - 1));
      return BLOCOS[idx];
    })
    .join('');
}

/**
 * Seta de tendência. `baixoEhBom` inverte o sentido (ex.: atrasados subindo é ruim).
 * Variação < 1% é considerada estável (▬).
 */
export function seta(deltaPct: number, baixoEhBom = false): string {
  if (Math.abs(deltaPct) < 1) return '▬';
  const bom = baixoEhBom ? deltaPct < 0 : deltaPct > 0;
  return bom ? '▲' : '▼';
}

/** Variação percentual protegida contra divisão por zero. */
export function variacaoPct(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((atual - anterior) / anterior) * 100);
}

/** Centavos (inteiro) → "R$ 1.234,56". Nunca recebe float. */
export function fmtMoeda(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Trunca preservando linhas inteiras (nunca corta no meio de uma) e marca o
 * corte. Garante caber em limite de chars do WhatsApp.
 */
export function truncar(texto: string, max: number): string {
  if (texto.length <= max) return texto;
  const marca = '\n… (resumo truncado)';
  const alvo = max - marca.length;
  const linhas = texto.split('\n');
  const out: string[] = [];
  let len = 0;
  for (const linha of linhas) {
    if (len + linha.length + 1 > alvo) break;
    out.push(linha);
    len += linha.length + 1;
  }
  return out.join('\n') + marca;
}

// ───────────────────────────── Datas tz-aware ─────────────────────────────

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function partsInTz(date: Date, tz: string): DateParts {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    // Intl pode devolver "24" para meia-noite — normaliza para 0.
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/** Offset do timezone (ms) no instante dado. America/Sao_Paulo ≈ -3h. */
function tzOffsetMs(date: Date, tz: string): number {
  const p = partsInTz(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - date.getTime();
}

/**
 * Janela [início, fim) do dia local (no tz do tenant) que contém `now`,
 * retornada como instantes UTC. Use para "vence hoje", "agenda do dia".
 */
export function limitesDoDia(now: Date, tz: string): { inicio: Date; fim: Date } {
  const p = partsInTz(now, tz);
  const offset = tzOffsetMs(now, tz);
  const inicio = new Date(Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0) - offset);
  const fim = new Date(inicio.getTime() + 86_400_000);
  return { inicio, fim };
}

/**
 * Janela [domingo 00:00, próximo domingo 00:00) da semana local (no tz do
 * tenant) que contém `now`. A semana começa no domingo → curva DSTQQSS.
 */
export function limitesDaSemana(now: Date, tz: string): { inicio: Date; fim: Date } {
  const p = partsInTz(now, tz);
  const dow = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay(); // 0=domingo
  const dia = limitesDoDia(now, tz);
  const inicio = new Date(dia.inicio.getTime() - dow * 86_400_000);
  const fim = new Date(inicio.getTime() + 7 * 86_400_000);
  return { inicio, fim };
}

/** "24/05" no tz do tenant. */
export function fmtData(date: Date, tz: string): string {
  const p = partsInTz(date, tz);
  return `${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')}`;
}

/** "09:14" no tz do tenant. */
export function fmtHora(date: Date, tz: string): string {
  const p = partsInTz(date, tz);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}
