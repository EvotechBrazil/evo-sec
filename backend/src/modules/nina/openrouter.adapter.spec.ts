import { OpenRouterAdapter } from './openrouter.adapter';
import { ChatMsg } from './contexto.service';

/**
 * Cobre a memória conversacional (SPEC-006) no adapter: o histórico opcional entra
 * entre o `system` e a mensagem atual, na ordem cronológica. Sem histórico, o body
 * fica `[system, user]` (compatível com chamadas antigas).
 */
describe('OpenRouterAdapter.intent (memória SPEC-006)', () => {
  const NOW = '2026-06-24T12:00:00.000Z';
  let fetchSpy: jest.SpyInstance;

  const okResponse = (content: string) =>
    ({
      ok: true,
      json: async () => ({ choices: [{ message: { content } }] }),
    } as never);

  beforeEach(() => {
    // loadEnv() (chamado no construtor do adapter) valida estas envs obrigatórias.
    process.env.DATABASE_URL ??= 'postgres://test';
    process.env.JWT_SECRET ??= 'test-jwt';
    process.env.JWT_REFRESH_SECRET ??= 'test-refresh';
    process.env.ENCRYPTION_KEY ??= '0123456789abcdef0123456789abcdef'; // 32 chars
    process.env.SERVICE_TOKEN ??= 'test-service';
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.OPENROUTER_MODEL_INTER = 'modelo-teste';
    fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(okResponse('{"acao":"conversa","dados":{},"resposta":"oi"}'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_MODEL_INTER;
  });

  const bodyMessages = (): { role: string; content: string }[] => {
    const call = fetchSpy.mock.calls[0];
    const init = call[1] as { body: string };
    return (JSON.parse(init.body) as { messages: { role: string; content: string }[] }).messages;
  };

  it('SEM histórico → messages = [system, user atual] (backward-compatible)', async () => {
    const adapter = new OpenRouterAdapter();
    const r = await adapter.intent('quanto tenho?', NOW);

    expect(r.acao).toBe('conversa');
    const msgs = bodyMessages();
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe('system');
    expect(msgs[1].role).toBe('user');
    expect(msgs[1].content).toContain('quanto tenho?');
    expect(msgs[1].content).toContain(NOW);
  });

  it('COM histórico → [system, ...pares user/assistant na ordem, user atual]', async () => {
    const historico: ChatMsg[] = [
      { role: 'user', conteudo: 'oi nina' },
      { role: 'assistant', conteudo: 'oi rodrigo!' },
      { role: 'user', conteudo: 'anota um recado' },
      { role: 'assistant', conteudo: 'feito!' },
    ];
    const adapter = new OpenRouterAdapter();
    await adapter.intent('e o saldo?', NOW, historico);

    const msgs = bodyMessages();
    // system + 4 do histórico + 1 atual = 6
    expect(msgs).toHaveLength(6);
    expect(msgs[0].role).toBe('system');
    // histórico preservado na ordem, mapeando `conteudo` -> `content`.
    expect(msgs.slice(1, 5)).toEqual([
      { role: 'user', content: 'oi nina' },
      { role: 'assistant', content: 'oi rodrigo!' },
      { role: 'user', content: 'anota um recado' },
      { role: 'assistant', content: 'feito!' },
    ]);
    // mensagem atual sempre por último.
    expect(msgs[5].role).toBe('user');
    expect(msgs[5].content).toContain('e o saldo?');
  });

  it('histórico vazio também produz [system, user]', async () => {
    const adapter = new OpenRouterAdapter();
    await adapter.intent('teste', NOW, []);
    const msgs = bodyMessages();
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe('system');
    expect(msgs[1].role).toBe('user');
  });

  // Telemetria de custo (SPEC-012/14C): o adapter parseia `usage` da resposta do
  // OpenRouter e o expõe junto do parse, sem alterar acao/dados/resposta.
  describe('telemetria de custo (usage)', () => {
    const okComUsage = (content: string, usage: unknown) =>
      ({
        ok: true,
        json: async () => ({ choices: [{ message: { content } }], usage }),
      } as never);

    it('parseia usage → tokensIn/tokensOut e converte cost (USD) p/ microUsd', async () => {
      fetchSpy.mockResolvedValue(
        okComUsage('{"acao":"conversa","dados":{},"resposta":"oi"}', {
          prompt_tokens: 123,
          completion_tokens: 45,
          cost: 0.0012, // USD → 1200 microUsd
        }),
      );
      const adapter = new OpenRouterAdapter();
      const r = await adapter.intent('oi', NOW);

      expect(r.usage).toEqual({ tokensIn: 123, tokensOut: 45 });
      expect(r.custoMicroUsd).toBe(1200);
      // parse normal preservado.
      expect(r.acao).toBe('conversa');
      expect(r.resposta).toBe('oi');
    });

    it('usage com tokens mas SEM cost → custoMicroUsd null (tokens preservados)', async () => {
      fetchSpy.mockResolvedValue(
        okComUsage('{"acao":"conversa","dados":{},"resposta":"oi"}', {
          prompt_tokens: 10,
          completion_tokens: 20,
        }),
      );
      const adapter = new OpenRouterAdapter();
      const r = await adapter.intent('oi', NOW);

      expect(r.usage).toEqual({ tokensIn: 10, tokensOut: 20 });
      expect(r.custoMicroUsd).toBeNull();
    });

    it('resposta SEM usage → usage e custoMicroUsd null (não quebra)', async () => {
      // okResponse padrão (sem `usage`).
      const adapter = new OpenRouterAdapter();
      const r = await adapter.intent('oi', NOW);

      expect(r.usage).toBeNull();
      expect(r.custoMicroUsd).toBeNull();
      expect(r.acao).toBe('conversa');
    });

    it('expõe o modelo da env (usado no body do fetch)', () => {
      const adapter = new OpenRouterAdapter();
      expect(adapter.modelo).toBe('modelo-teste');
    });
  });
});
