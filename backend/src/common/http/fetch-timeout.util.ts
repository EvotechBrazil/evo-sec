/**
 * Resiliência HTTP (SPEC-008) — `fetch` externos sem timeout podem pendurar a
 * request por ~5min (default do Node). Estas utils dão um teto de tempo via
 * `AbortController` e, opcionalmente, 1 retry para status transitórios.
 *
 * Em timeout o `fetch` rejeita com `AbortError` (deixamos propagar — quem chama,
 * tipicamente um adapter, converte em `ServiceUnavailableException`).
 *
 * Node 18+ traz `fetch`/`AbortController` nativos; chamamos o `global.fetch` por
 * baixo, então mocks de `global.fetch` nos testes dos adapters continuam valendo.
 */

/** Status HTTP transitórios em que vale a pena tentar de novo (1 retry). */
const STATUS_RETRY = new Set([429, 502, 503, 504]);

/**
 * `fetch` com teto de tempo. Aborta a requisição após `timeoutMs` e SEMPRE limpa
 * o timer no `finally` (sem handle vazando). Não traduz o erro: em timeout o
 * `fetch` lança `AbortError` e ele propaga.
 */
export async function fetchComTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = 12000,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export interface RetryOpts {
  /** Teto de tempo por tentativa (ms). Default 12000. */
  timeoutMs?: number;
  /** Total de tentativas (1 = sem retry). Default 2 (1 retry). */
  tentativas?: number;
  /** Backoff entre tentativas (ms). Default 300. */
  backoffMs?: number;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * `fetchComTimeout` + retry curto APENAS para status transitórios (429/502/503/504).
 * Não faz retry em timeout (`AbortError`) nem em 4xx que não sejam 429 — esses são
 * propagados/retornados na hora. Mantém o teto de tempo por tentativa.
 */
export async function fetchComRetry(
  url: string,
  init?: RequestInit,
  opts: RetryOpts = {},
): Promise<Response> {
  const { timeoutMs = 12000, tentativas = 2, backoffMs = 300 } = opts;
  let res = await fetchComTimeout(url, init, timeoutMs);
  for (let i = 1; i < tentativas && STATUS_RETRY.has(res.status); i++) {
    await sleep(backoffMs);
    res = await fetchComTimeout(url, init, timeoutMs);
  }
  return res;
}
