/**
 * Quiet hours (janela de silêncio) do tenant — SPEC-010.
 *
 * Os campos `Tenant.quietHoursInicio`/`quietHoursFim` são strings `HH:MM` (podem ser
 * nulos). Comparação feita no **fuso do tenant** (via `Intl`), e a janela pode cruzar
 * a meia-noite (ex.: 22:00–07:00). Sem janela válida → nunca está em silêncio.
 */
export function dentroQuietHours(
  now: Date,
  tz: string,
  inicio?: string | null,
  fim?: string | null,
): boolean {
  const ini = paraMinutos(inicio);
  const f = paraMinutos(fim);
  if (ini === null || f === null || ini === f) return false; // sem janela válida

  const atual = minutosLocais(now, tz);
  if (ini < f) return atual >= ini && atual < f; // mesma data (ex.: 13:00–14:00)
  return atual >= ini || atual < f; // cruza a meia-noite (ex.: 22:00–07:00)
}

/** "HH:MM" → minutos do dia (0–1439); inválido/ausente → null. */
function paraMinutos(hhmm?: string | null): number | null {
  const m = (hhmm ?? '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Minutos do dia (0–1439) de `now` no fuso do tenant. */
function minutosLocais(now: Date, tz: string): number {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const map: Record<string, string> = {};
  for (const p of f.formatToParts(now)) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  const h = Number(map.hour) % 24; // Intl pode devolver "24" p/ meia-noite
  return h * 60 + Number(map.minute);
}
