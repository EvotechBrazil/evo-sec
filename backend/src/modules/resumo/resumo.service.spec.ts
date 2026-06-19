import { ResumoService } from './resumo.service';

/**
 * Testes de unidade do ResumoService com dependências mockadas (sem DB).
 * Foco: agregação correta, seções condicionais, "tudo em dia", opt-out e
 * truncamento. Isolamento por tenant é garantido no repositório (ver
 * resumo.repository.spec.ts).
 */

const SP = 'America/Sao_Paulo';

function build(overrides: Partial<Record<string, unknown>> = {}) {
  const deps = {
    recados: { list: jest.fn().mockResolvedValue([]) },
    tarefas: { list: jest.fn().mockResolvedValue([]) },
    lembretes: { list: jest.fn().mockResolvedValue([]) },
    agenda: { list: jest.fn().mockResolvedValue([]) },
    financeiro: { list: jest.fn().mockResolvedValue([]) },
    repo: {
      tenantInfo: jest.fn().mockResolvedValue({ timezone: SP, whatsappNumber: '5543999999999' }),
      flagAtiva: jest.fn().mockResolvedValue(true),
      listVips: jest.fn().mockResolvedValue([]),
    },
    ...overrides,
  };
  const service = new ResumoService(
    deps.recados as never,
    deps.tarefas as never,
    deps.lembretes as never,
    deps.agenda as never,
    deps.financeiro as never,
    deps.repo as never,
  );
  return { service, deps };
}

describe('ResumoService.diario', () => {
  it('agrega contas/tarefas/lembretes/agenda/VIPs e monta as seções', async () => {
    const { service } = build({
      financeiro: {
        list: jest.fn().mockResolvedValue([
          { id: 'a', descricao: 'Aluguel', valorCentavos: 150000, vencimento: new Date('2026-06-15T12:00:00Z'), status: 'PENDENTE' },
          { id: 'b', descricao: 'Internet', valorCentavos: 9900, vencimento: new Date('2026-06-19T15:00:00Z'), status: 'PENDENTE' },
        ]),
      },
      tarefas: {
        list: jest.fn().mockResolvedValue([
          { id: 't', titulo: 'Enviar relatório', prazo: new Date('2026-06-10T12:00:00Z'), status: 'PENDENTE' },
        ]),
      },
      lembretes: {
        list: jest.fn().mockResolvedValue([
          { id: 'l', titulo: 'Tomar remédio', dataHora: new Date('2026-06-19T13:00:00Z'), status: 'PENDENTE' },
        ]),
      },
      agenda: {
        list: jest.fn().mockResolvedValue([
          { titulo: 'Reunião', inicio: new Date('2026-06-19T13:00:00Z'), diaInteiro: false, local: 'Sala', status: 'CONFIRMADO' },
        ]),
      },
      recados: {
        list: jest.fn().mockResolvedValue([
          { remetente: 'Roberto VIP', conteudo: 'Bom dia, preciso falar', status: 'PENDENTE' },
        ]),
      },
      repo: {
        tenantInfo: jest.fn().mockResolvedValue({ timezone: SP, whatsappNumber: '55' }),
        flagAtiva: jest.fn().mockResolvedValue(true),
        listVips: jest.fn().mockResolvedValue([{ nome: 'Roberto' }]),
      },
    });

    const r = await service.diario('2026-06-19');

    expect(r.resumo.venceHoje.contas).toBe(1);
    expect(r.resumo.venceHoje.lembretes).toBe(1);
    expect(r.resumo.atrasados.contas).toBe(1);
    expect(r.resumo.atrasados.tarefas).toBe(1);
    expect(r.resumo.compromissos).toBe(1);
    expect(r.resumo.vipsAguardando).toBe(1);

    expect(r.texto).toContain('Atrasado');
    expect(r.texto).toContain('Vence hoje');
    expect(r.texto).toContain('Reunião');
    expect(r.texto).toContain('Roberto VIP');
    expect(r.numero).toBe('55');
    expect(r.dia).toBe('19/06');
  });

  it('mostra "tudo em dia" quando não há pendências', async () => {
    const { service } = build();
    const r = await service.diario('2026-06-19');
    expect(r.texto).toContain('Tudo em dia');
    expect(r.resumo.compromissos).toBe(0);
  });

  it('respeita opt-out (flagAtiva=false → ativo=false)', async () => {
    const { service } = build({
      repo: {
        tenantInfo: jest.fn().mockResolvedValue({ timezone: SP, whatsappNumber: null }),
        flagAtiva: jest.fn().mockResolvedValue(false),
        listVips: jest.fn().mockResolvedValue([]),
      },
    });
    const r = await service.diario('2026-06-19');
    expect(r.ativo).toBe(false);
    expect(r.numero).toBeNull();
  });
});

describe('ResumoService.semanal', () => {
  it('conta criados/concluídos e marca backlog atrasado', async () => {
    const dentro = new Date('2026-06-17T12:00:00Z');
    const { service } = build({
      tarefas: {
        list: jest.fn().mockResolvedValue([
          { titulo: 'A', createdAt: dentro, updatedAt: dentro, status: 'PENDENTE', prazo: new Date('2026-06-10T12:00:00Z') },
          { titulo: 'B', createdAt: dentro, updatedAt: dentro, status: 'CONCLUIDO', prazo: null },
        ]),
      },
    });
    const r = await service.semanal('2026-06-13', '2026-06-19');
    expect(r.resumo.criados).toBe(2);
    expect(r.resumo.concluidos).toBe(1);
    expect(r.resumo.backlogPendente).toBe(1);
    expect(r.resumo.backlogAtrasado).toBe(1);
    expect(r.texto).toContain('Resumo da semana');
    // sem espaços sobrando no fim de nenhuma linha
    expect(r.texto.split('\n').every((l) => l === l.replace(/[ \t]+$/, ''))).toBe(true);
  });
});
