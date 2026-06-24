import { fetchComTimeout, fetchComRetry } from './fetch-timeout.util';

/**
 * Cobre a resiliência HTTP (SPEC-008): teto de tempo via AbortController + retry
 * curto só para status transitórios. Determinístico — `global.fetch` é mockado e o
 * caso de timeout usa um fetch que respeita o `signal` (rejeita com AbortError ao
 * abortar) com `timeoutMs` pequeno; não depende de relógio real frágil.
 */
describe('fetchComTimeout / fetchComRetry (SPEC-008)', () => {
  afterEach(() => jest.restoreAllMocks());

  const okResponse = (status = 200) => ({ ok: status < 400, status } as never);

  /** fetch falso que respeita o AbortSignal: resolve após `respondeEmMs`, mas se o
   *  signal abortar antes, rejeita com um AbortError (igual ao fetch nativo). */
  const fetchQueRespeitaSignal = (respondeEmMs: number) =>
    jest.fn((_url: string, init?: { signal?: AbortSignal }) => {
      return new Promise((resolve, reject) => {
        const sig = init?.signal;
        const t = setTimeout(() => resolve(okResponse(200)), respondeEmMs);
        sig?.addEventListener('abort', () => {
          clearTimeout(t);
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

  it('(a) resolve normal quando o fetch é rápido', async () => {
    const spy = jest.spyOn(global, 'fetch').mockResolvedValue(okResponse(200));
    const res = await fetchComTimeout('http://x', { method: 'GET' }, 50);
    expect(res.status).toBe(200);
    // o signal foi injetado no init repassado ao fetch nativo.
    const init = spy.mock.calls[0][1] as { signal?: AbortSignal };
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('(b) timeout aborta → rejeita com AbortError', async () => {
    // fetch demoraria 1s, mas o timeout de 20ms aborta antes.
    jest.spyOn(global, 'fetch').mockImplementation(fetchQueRespeitaSignal(1000) as never);
    await expect(fetchComTimeout('http://x', undefined, 20)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('(c) limpa o timer (sem handle vazando) — sucesso e erro', async () => {
    const clearSpy = jest.spyOn(global, 'clearTimeout');

    // caminho de sucesso
    jest.spyOn(global, 'fetch').mockResolvedValue(okResponse(200));
    await fetchComTimeout('http://x', undefined, 50);
    expect(clearSpy).toHaveBeenCalledTimes(1);

    // caminho de erro de rede: o finally também limpa o timer.
    clearSpy.mockClear();
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('boom'));
    await expect(fetchComTimeout('http://x', undefined, 50)).rejects.toThrow('boom');
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it('(d) retry em 503 (transitório) e sucesso na 2ª tentativa', async () => {
    const spy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(okResponse(503))
      .mockResolvedValueOnce(okResponse(200));
    const res = await fetchComRetry('http://x', undefined, { timeoutMs: 50, backoffMs: 1 });
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('(d) SEM retry em 400 (4xx não-transitório) — retorna na 1ª', async () => {
    const spy = jest.spyOn(global, 'fetch').mockResolvedValue(okResponse(400));
    const res = await fetchComRetry('http://x', undefined, { timeoutMs: 50, backoffMs: 1 });
    expect(res.status).toBe(400);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('(d) NÃO faz retry em timeout (AbortError propaga, sem 2ª tentativa)', async () => {
    const spy = jest
      .spyOn(global, 'fetch')
      .mockImplementation(fetchQueRespeitaSignal(1000) as never);
    await expect(
      fetchComRetry('http://x', undefined, { timeoutMs: 20, backoffMs: 1 }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
