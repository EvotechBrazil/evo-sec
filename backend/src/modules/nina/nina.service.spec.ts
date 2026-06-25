import { ModeloTarefa } from '@prisma/client';
import { NinaService } from './nina.service';
import { OpenRouterAdapter, IntentResult } from './openrouter.adapter';
import { ContextoService, ChatMsg } from './contexto.service';

/**
 * Cobre o plug da memória durável (SPEC-006) em `NinaService.processar`:
 * carrega o histórico ANTES do LLM e grava o par user/assistant DEPOIS,
 * de forma best-effort (uma falha na persistência não derruba a resposta).
 */
describe('NinaService — memória conversacional (SPEC-006)', () => {
  const intentResult: IntentResult = { acao: 'conversa', dados: {}, resposta: 'Oi, Rodrigo!' };

  // Ordem de execução observada, para provar historico() ANTES do intent().
  let ordem: string[];
  let historico: jest.Mock;
  let registrar: jest.Mock;
  let intent: jest.Mock;

  const build = () => {
    ordem = [];
    historico = jest.fn(async (): Promise<ChatMsg[]> => {
      ordem.push('historico');
      return [{ role: 'user', conteudo: 'msg antiga' }];
    });
    registrar = jest.fn(async (role: string) => {
      ordem.push(`registrar:${role}`);
    });
    intent = jest.fn(async (): Promise<IntentResult> => {
      ordem.push('intent');
      return intentResult;
    });

    const contexto = { historico, registrar } as unknown as ContextoService;
    const llm = { intent } as unknown as OpenRouterAdapter;

    return new NinaService(
      llm,
      contexto,
      {} as never, // recados
      {} as never, // tarefas
      {} as never, // lembretes
      {} as never, // agenda
      {} as never, // financeiro
      {} as never, // categorias
      {} as never, // financas
      {} as never, // voz
      { registrar: jest.fn().mockResolvedValue({}) } as never, // custo
    );
  };

  it('numa msg simples (conversa): historico() ANTES do intent, registrar() DEPOIS', async () => {
    const service = build();
    const reply = await service.processar('oi nina');

    expect(reply).toEqual({ resposta: 'Oi, Rodrigo!', acao: 'conversa' });

    // historico carregado e repassado ao intent (3º arg).
    expect(historico).toHaveBeenCalledTimes(1);
    expect(intent).toHaveBeenCalledWith('oi nina', expect.any(String), [
      { role: 'user', conteudo: 'msg antiga' },
    ]);

    // par user/assistant gravado com os textos certos.
    expect(registrar).toHaveBeenNthCalledWith(1, 'user', 'oi nina');
    expect(registrar).toHaveBeenNthCalledWith(2, 'assistant', 'Oi, Rodrigo!');

    // ordem global: historico → intent → registrar(user) → registrar(assistant).
    expect(ordem).toEqual(['historico', 'intent', 'registrar:user', 'registrar:assistant']);
  });

  it('persistência é best-effort: registrar() falhando não quebra a resposta', async () => {
    const service = build();
    registrar.mockRejectedValue(new Error('db down'));

    const reply = await service.processar('oi nina');
    expect(reply.resposta).toBe('Oi, Rodrigo!');
    expect(reply.acao).toBe('conversa');
  });

  it('historico() falhando não quebra: chama o LLM com lista vazia', async () => {
    const service = build();
    historico.mockRejectedValue(new Error('db down'));

    const reply = await service.processar('oi nina');
    expect(reply.resposta).toBe('Oi, Rodrigo!');
    expect(intent).toHaveBeenCalledWith('oi nina', expect.any(String), []);
  });

  it('no caminho de confirmação (pendente afirmado) NÃO chama o LLM', async () => {
    const service = build();
    // texto afirmativo + pendente 'pagar' sem ids → executa direto, sem NLU.
    const reply = await service.processar('sim', { tipo: 'pagar', ids: [], nomes: ['conta x'] });

    expect(intent).not.toHaveBeenCalled();
    expect(historico).not.toHaveBeenCalled();
    expect(reply.acao).toBe('confirmar');
  });
});

/**
 * SPEC-007: a Nina pergunta data/hora quando falta (em vez de chutar) e ancora
 * as datas ao fuso BR (corrige o off-by-one do orb). Brain do app (nina.service).
 */
describe('NinaService — datas/timezone (SPEC-007)', () => {
  function build(intentResult: IntentResult) {
    const intent = jest.fn(async (..._args: unknown[]) => intentResult);
    const lembreteCreate = jest.fn().mockResolvedValue({});
    const agendaCreate = jest.fn().mockResolvedValue({});
    const financeiroCreate = jest.fn().mockResolvedValue({});
    const service = new NinaService(
      { intent } as never, // llm
      { historico: jest.fn().mockResolvedValue([]), registrar: jest.fn().mockResolvedValue(undefined) } as never, // contexto
      {} as never, // recados
      {} as never, // tarefas
      { create: lembreteCreate } as never, // lembretes
      { create: agendaCreate } as never, // agenda
      { create: financeiroCreate } as never, // financeiro
      { resolverPorNome: jest.fn().mockResolvedValue(null) } as never, // categorias
      {} as never, // financas
      {} as never, // voz
      { registrar: jest.fn().mockResolvedValue({}) } as never, // custo
    );
    return { service, intent, lembreteCreate, agendaCreate, financeiroCreate };
  }

  it('criar_conta SEM vencimento → pergunta (não grava)', async () => {
    const { service, financeiroCreate } = build({ acao: 'criar_conta', dados: { valorCentavos: 8000, descricao: 'internet' }, resposta: 'ok' });
    const reply = await service.processar('tenho conta de internet de 80');
    expect(reply.resposta).toMatch(/vencimento/i);
    expect(reply.pendente).toBeNull();
    expect(financeiroCreate).not.toHaveBeenCalled();
  });

  it('criar_conta COM vencimento UTC → ancora ao fuso BR no payload (dia 30, não 29)', async () => {
    const { service } = build({ acao: 'criar_conta', dados: { valorCentavos: 8000, descricao: 'internet', vencimento: '2026-07-30T00:00:00Z' }, resposta: 'ok' });
    const reply = await service.processar('conta de internet 80 dia 30');
    expect(reply.pendente?.payload?.vencimento).toBe('2026-07-30T00:00:00-03:00');
  });

  it('criar_agenda SEM início → pergunta (não cria)', async () => {
    const { service, agendaCreate } = build({ acao: 'criar_agenda', dados: { titulo: 'reunião com o contador' }, resposta: 'ok' });
    const reply = await service.processar('marca uma reunião com o contador');
    expect(reply.resposta).toMatch(/dia e hor/i);
    expect(agendaCreate).not.toHaveBeenCalled();
  });

  it('criar_lembrete SEM dataHora → pergunta (não cria)', async () => {
    const { service, lembreteCreate } = build({ acao: 'criar_lembrete', dados: { titulo: 'ligar pro contador' }, resposta: 'ok' });
    const reply = await service.processar('me lembra de ligar pro contador');
    expect(reply.resposta).toMatch(/quando/i);
    expect(lembreteCreate).not.toHaveBeenCalled();
  });

  it('passa a data atual ao LLM com offset -03:00 (SP-local)', async () => {
    const { service, intent } = build({ acao: 'conversa', dados: {}, resposta: 'oi' });
    await service.processar('oi');
    expect(intent.mock.calls[0][1]).toMatch(/-03:00$/);
  });
});

/**
 * SPEC-012/14C: grava telemetria de custo LLM (UsoLlm) de verdade. Após o NLU, se a
 * resposta trouxe `usage`, chama custo.registrar com os tokens + modelo. Best-effort:
 * sem `usage` não registra; e uma falha na gravação NUNCA derruba a resposta da Nina.
 */
describe('NinaService — telemetria de custo LLM (SPEC-012/14C)', () => {
  function build(intentResult: IntentResult, modelo = 'modelo-teste') {
    const intent = jest.fn(async (..._args: unknown[]) => intentResult);
    const registrar = jest.fn().mockResolvedValue({});
    const service = new NinaService(
      { intent, modelo } as never, // llm
      { historico: jest.fn().mockResolvedValue([]), registrar: jest.fn().mockResolvedValue(undefined) } as never, // contexto
      {} as never, // recados
      {} as never, // tarefas
      {} as never, // lembretes
      {} as never, // agenda
      {} as never, // financeiro
      {} as never, // categorias
      {} as never, // financas
      {} as never, // voz
      { registrar } as never, // custo
    );
    return { service, intent, registrar };
  }

  it('com usage → custo.registrar é chamado com tokens, modelo e custoMicroUsd', async () => {
    const { service, registrar } = build({
      acao: 'conversa',
      dados: {},
      resposta: 'oi',
      usage: { tokensIn: 123, tokensOut: 45 },
      custoMicroUsd: 1200,
    });
    await service.processar('oi');

    expect(registrar).toHaveBeenCalledTimes(1);
    expect(registrar).toHaveBeenCalledWith({
      tarefa: ModeloTarefa.CLASSIFICAR,
      modelo: 'modelo-teste',
      tokensIn: 123,
      tokensOut: 45,
      custoMicroUsd: 1200,
    });
  });

  it('usage sem custoMicroUsd → registra com custoMicroUsd 0', async () => {
    const { service, registrar } = build({
      acao: 'conversa',
      dados: {},
      resposta: 'oi',
      usage: { tokensIn: 10, tokensOut: 20 },
      custoMicroUsd: null,
    });
    await service.processar('oi');

    expect(registrar).toHaveBeenCalledWith(expect.objectContaining({ custoMicroUsd: 0, tokensIn: 10, tokensOut: 20 }));
  });

  it('SEM usage → não registra (não quebra)', async () => {
    const { service, registrar } = build({ acao: 'conversa', dados: {}, resposta: 'oi', usage: null });
    const reply = await service.processar('oi');

    expect(registrar).not.toHaveBeenCalled();
    expect(reply.resposta).toBe('oi');
  });

  it('best-effort: custo.registrar rejeitando NÃO quebra processar', async () => {
    const { service, registrar } = build({
      acao: 'conversa',
      dados: {},
      resposta: 'oi',
      usage: { tokensIn: 1, tokensOut: 2 },
      custoMicroUsd: 5,
    });
    registrar.mockRejectedValue(new Error('db down'));

    const reply = await service.processar('oi');
    expect(reply.resposta).toBe('oi');
    expect(reply.acao).toBe('conversa');
    expect(registrar).toHaveBeenCalledTimes(1);
  });
});
