import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { WebhookService } from './webhook.service';

/**
 * Testa a ponte de webhook em isolamento. `loadEnv()` roda no construtor do
 * service (campo de instância), então setamos as envs obrigatórias + as da
 * ponte ANTES de instanciar, e mockamos o `global.fetch` (usado por
 * `fetchComTimeout`).
 */
describe('WebhookService', () => {
  const ENV_BASE = {
    DATABASE_URL: 'postgres://x',
    JWT_SECRET: 'x',
    JWT_REFRESH_SECRET: 'x',
    ENCRYPTION_KEY: '12345678901234567890123456789012', // 32 chars exatos
    SERVICE_TOKEN: 'svc',
  };
  const TOKEN = 'segredo-123';
  const N8N_URL = 'https://n8n.example/webhook/nina';
  const DEFAULT_URL = 'https://alicia-n8n.rte6ms.easypanel.host/webhook/nina';
  const originalFetch = global.fetch;

  let fetchMock: jest.Mock;

  beforeEach(() => {
    Object.assign(process.env, ENV_BASE);
    process.env.NINA_WEBHOOK_TOKEN = TOKEN;
    process.env.NINA_N8N_WEBHOOK_URL = N8N_URL;
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NINA_WEBHOOK_TOKEN;
    delete process.env.NINA_N8N_WEBHOOK_URL;
  });

  it('repassa o payload pro n8n com o token na query e responde ok', async () => {
    const svc = new WebhookService();
    const payload = { event: 'messages.upsert', instance: 'nina' };

    const out = await svc.repassarNina(payload, TOKEN);

    expect(out).toEqual({ status: 'ok' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${N8N_URL}?token=${encodeURIComponent(TOKEN)}`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it('com NINA_WEBHOOK_TOKEN setado, rejeita token diferente com 401 e NÃO chama o n8n', async () => {
    const svc = new WebhookService();
    await expect(svc.repassarNina({}, 'errado')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('SEM NINA_WEBHOOK_TOKEN, não valida no backend e repassa o token recebido (n8n é o portão)', async () => {
    delete process.env.NINA_WEBHOOK_TOKEN;
    const svc = new WebhookService();

    const out = await svc.repassarNina({ a: 1 }, 'token-do-evolution');

    expect(out).toEqual({ status: 'ok' });
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(`${N8N_URL}?token=token-do-evolution`);
  });

  it('usa o default de NINA_N8N_WEBHOOK_URL quando a env não está setada', async () => {
    delete process.env.NINA_N8N_WEBHOOK_URL;
    const svc = new WebhookService();

    await svc.repassarNina({ a: 1 }, TOKEN);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(`${DEFAULT_URL}?token=${encodeURIComponent(TOKEN)}`);
  });

  it('503 quando o n8n responde erro (ex. 500)', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    const svc = new WebhookService();
    await expect(svc.repassarNina({ a: 1 }, TOKEN)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('503 quando o fetch estoura (timeout/rede)', async () => {
    fetchMock.mockRejectedValue(new Error('The operation was aborted'));
    const svc = new WebhookService();
    await expect(svc.repassarNina({ a: 1 }, TOKEN)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
