import { AlertaAguardandoService } from './alertas-aguardando.service';

/**
 * Testes de unidade do AlertaAguardandoService (SPEC-004 §3.3) com dependências
 * mockadas (sem DB). Foco: só entram AGUARDANDO PENDENTE com dataCobranca até o
 * fim de hoje (tz do tenant), ordenação asc, opt-out, temAlerta e texto.
 * Isolamento por tenant é garantido no ResumoRepository (ver resumo.repository.spec.ts).
 */

const SP = 'America/Sao_Paulo';

interface TarefaMock {
  titulo: string;
  descricao?: string | null;
  tipo?: string;
  aguardandoDe?: string | null;
  dataCobranca?: Date | null;
  status?: string;
}

function tarefa(t: TarefaMock) {
  return {
    titulo: t.titulo,
    descricao: t.descricao ?? null,
    tipo: t.tipo ?? 'AGUARDANDO',
    aguardandoDe: t.aguardandoDe ?? null,
    dataCobranca: t.dataCobranca ?? null,
    status: t.status ?? 'PENDENTE',
  };
}

function build(overrides: Partial<Record<string, unknown>> = {}) {
  const deps = {
    tarefas: { list: jest.fn().mockResolvedValue([]) },
    repo: {
      tenantInfo: jest.fn().mockResolvedValue({ timezone: SP, whatsappNumber: '5543999999999' }),
      flagAtiva: jest.fn().mockResolvedValue(true),
    },
    ...overrides,
  };
  const service = new AlertaAguardandoService(deps.tarefas as never, deps.repo as never);
  return { service, deps };
}

describe('AlertaAguardandoService.gerar', () => {
  it('só cobra AGUARDANDO PENDENTE com dataCobranca <= fim de hoje (futura NÃO entra)', async () => {
    const { service, deps } = build({
      tarefas: {
        list: jest.fn().mockResolvedValue([
          // passado: cobrança marcada antes de hoje → entra
          tarefa({ titulo: 'Orçamento gráfica', aguardandoDe: 'Carlos', dataCobranca: new Date('2026-06-20T12:00:00Z') }),
          // hoje (24/06 no tz SP) → entra
          tarefa({ titulo: 'Resposta proposta', aguardandoDe: 'Ana', dataCobranca: new Date('2026-06-24T13:00:00Z') }),
          // futura → NÃO entra
          tarefa({ titulo: 'Contrato assinado', aguardandoDe: 'Bruno', dataCobranca: new Date('2026-06-30T12:00:00Z') }),
          // concluída (mesmo com cobrança passada) → NÃO entra
          tarefa({ titulo: 'Já resolvido', aguardandoDe: 'Zé', dataCobranca: new Date('2026-06-19T12:00:00Z'), status: 'CONCLUIDO' }),
          // sem dataCobranca → NÃO entra
          tarefa({ titulo: 'Sem prazo de cobrança', aguardandoDe: 'Lia', dataCobranca: null }),
        ]),
      },
    });

    const r = await service.gerar('2026-06-24');

    // só list(AGUARDANDO) é consultado
    expect(deps.tarefas.list).toHaveBeenCalledWith('AGUARDANDO');
    expect(r.resumo.aCobrar).toBe(2);
    expect(r.temAlerta).toBe(true);
    expect(r.dia).toBe('24/06');
    expect(r.texto).toContain('Orçamento gráfica');
    expect(r.texto).toContain('Resposta proposta');
    expect(r.texto).not.toContain('Contrato assinado');
    expect(r.texto).not.toContain('Já resolvido');
    expect(r.texto).not.toContain('Sem prazo de cobrança');
  });

  it('ordena por dataCobranca asc (mais antigo primeiro)', async () => {
    const { service } = build({
      tarefas: {
        list: jest.fn().mockResolvedValue([
          tarefa({ titulo: 'Mais nova', aguardandoDe: 'B', dataCobranca: new Date('2026-06-23T12:00:00Z') }),
          tarefa({ titulo: 'Mais antiga', aguardandoDe: 'A', dataCobranca: new Date('2026-06-10T12:00:00Z') }),
          tarefa({ titulo: 'Meio', aguardandoDe: 'C', dataCobranca: new Date('2026-06-18T12:00:00Z') }),
        ]),
      },
    });

    const r = await service.gerar('2026-06-24');
    const linhas = r.texto.split('\n').filter((l) => l.startsWith('•'));
    expect(linhas[0]).toContain('Mais antiga');
    expect(linhas[1]).toContain('Meio');
    expect(linhas[2]).toContain('Mais nova');
  });

  it('respeita opt-out (flagAtiva=false → ativo=false, temAlerta=false, texto vazio)', async () => {
    const { service, deps } = build({
      tarefas: {
        list: jest.fn().mockResolvedValue([
          tarefa({ titulo: 'Cobrar fulano', aguardandoDe: 'Fulano', dataCobranca: new Date('2026-06-20T12:00:00Z') }),
        ]),
      },
      repo: {
        tenantInfo: jest.fn().mockResolvedValue({ timezone: SP, whatsappNumber: '55' }),
        flagAtiva: jest.fn().mockResolvedValue(false),
      },
    });

    const r = await service.gerar('2026-06-24');
    expect(r.ativo).toBe(false);
    expect(r.temAlerta).toBe(false);
    expect(r.texto).toBe('');
    expect(deps.repo.flagAtiva).toHaveBeenCalledWith('alerta_aguardando_ativo');
  });

  it('temAlerta=false quando não há nada a cobrar (texto vazio)', async () => {
    const { service } = build({
      tarefas: {
        list: jest.fn().mockResolvedValue([
          // só futura → nada a cobrar hoje
          tarefa({ titulo: 'Futura', aguardandoDe: 'X', dataCobranca: new Date('2026-07-15T12:00:00Z') }),
        ]),
      },
    });

    const r = await service.gerar('2026-06-24');
    expect(r.ativo).toBe(true);
    expect(r.temAlerta).toBe(false);
    expect(r.resumo.aCobrar).toBe(0);
    expect(r.texto).toBe('');
  });

  it('numero vem do tenantInfo (whatsappNumber)', async () => {
    const { service } = build({
      repo: {
        tenantInfo: jest.fn().mockResolvedValue({ timezone: SP, whatsappNumber: '5511888887777' }),
        flagAtiva: jest.fn().mockResolvedValue(true),
      },
    });
    const r = await service.gerar('2026-06-24');
    expect(r.numero).toBe('5511888887777');
  });

  it('texto traz o título e "aguardando {quem}" de cada item', async () => {
    const { service } = build({
      tarefas: {
        list: jest.fn().mockResolvedValue([
          tarefa({ titulo: 'Retorno do banco', aguardandoDe: 'Gerente Marcos', dataCobranca: new Date('2026-06-21T12:00:00Z') }),
        ]),
      },
    });

    const r = await service.gerar('2026-06-24');
    expect(r.texto).toContain('Follow-ups pra cobrar (1)');
    expect(r.texto).toContain('Retorno do banco');
    expect(r.texto).toContain('aguardando Gerente Marcos');
    expect(r.texto).toContain('desde 21/06');
  });

  it('usa "—" quando aguardandoDe é null', async () => {
    const { service } = build({
      tarefas: {
        list: jest.fn().mockResolvedValue([
          tarefa({ titulo: 'Sem responsável', aguardandoDe: null, dataCobranca: new Date('2026-06-22T12:00:00Z') }),
        ]),
      },
    });

    const r = await service.gerar('2026-06-24');
    expect(r.texto).toContain('aguardando —');
  });
});
