import { Recorrencia } from '@prisma/client';

/**
 * Próxima ocorrência de um lembrete recorrente, ESTRITAMENTE após `apos`.
 *
 * Avança `base` pela cadência até passar de `apos` — assim um recorrente atrasado
 * (que deveria ter disparado há vários ciclos) avança para a **próxima ocorrência
 * futura** numa tacada só, sem disparar uma rajada de atrasados.
 *
 * `NENHUMA`/`CUSTOM` → `null` (não recorre).
 *
 * Passo de calendário (`setDate`/`setMonth`/`setFullYear`): o Brasil é UTC-3 fixo
 * (sem horário de verão desde 2019), então o wall-clock se mantém estável. Se o DST
 * voltar, revisar (premortem #25). MENSAL preserva o dia; em borda de mês o JS faz
 * overflow nativo (ex.: 31/01 +1 mês → 03/03) — comportamento aceito na v1.
 *
 * `cap` de iterações como rede contra loop (nunca atingido em uso normal).
 */
export function proximaOcorrencia(
  base: Date,
  recorrencia: Recorrencia,
  apos: Date,
): Date | null {
  const avancar = (d: Date): Date | null => {
    const n = new Date(d.getTime());
    switch (recorrencia) {
      case 'DIARIO':
        n.setDate(n.getDate() + 1);
        return n;
      case 'SEMANAL':
        n.setDate(n.getDate() + 7);
        return n;
      case 'MENSAL':
        n.setMonth(n.getMonth() + 1);
        return n;
      case 'ANUAL':
        n.setFullYear(n.getFullYear() + 1);
        return n;
      default:
        return null; // NENHUMA / CUSTOM → não recorre
    }
  };

  let prox = avancar(base);
  if (prox === null) return null;

  for (let i = 0; i < 4000 && prox.getTime() <= apos.getTime(); i++) {
    const seguinte = avancar(prox);
    if (seguinte === null) break;
    prox = seguinte;
  }
  return prox;
}
