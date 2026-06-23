import { AlertaVencimentosService } from './alertas-vencimentos.service';
import { fmtMoeda } from '../format.util';

/**
 * Testes de unidade do AlertaVencimentosService com dependências mockadas
 * (sem DB). Foco: categorização on-read (atrasada/hoje/próximos), separação
 * por tipo, opt-out, temAlerta vazio e moeda em centavos. Datas determinísticas
 * via `dataIso` fixo (NUNCA new Date() real). Isolamento por tenant é garantido
 * no ResumoRepository (ver resumo.repository.spec.ts).
 */

const SP = 'America/Sao_Paulo';
const HOJE = '2026-06-24'; // janela do dia em SP: [24/06 03:00Z, 25/06 03:00Z)

// Helper p/ montar uma Conta mínima (só os campos que o serviço lê).
function conta(over: Partial<Record<string, unknown>>): unknown {
  return {
    id: 'c',
    descricao: 'Conta',
    tipo: 'A_PAGAR',
    valorCentavos: 10000,
    vencimento: new Date('2026-06-24T12:00:00Z'),
    status: 'PENDENTE',
    contraparte: null,
    ...over,
  };
}

function build(overrides: Partial<Record<string, unknown>> = {}) {
  const deps = {
    financeiro: { vencimentos: jest.fn().mockResolvedValue([]) },
    repo: {
      tenantInfo: jest
        .fn()
        .mockResolvedValue({ timezone: SP, whatsappNumber: '5543999999999' }),
      flagAtiva: jest.fn().mockResolvedValue(true),
    },
    ...overrides,
  };
  const service = new AlertaVencimentosService(
    deps.financeiro as never,
    deps.repo as never,
  );
  return { service, deps };
}

describe('AlertaVencimentosService.gerar', () => {
  it('categoriza atrasada/hoje/próximos pela borda do dia (tz do tenant)', async () => {
    const { service } = build({
      financeiro: {
        vencimentos: jest.fn().mockResolvedValue([
          // atrasada: antes do início de hoje (24/06 03:00Z)
          conta({ id: 'a', descricao: 'Aluguel', vencimento: new Date('2026-06-20T12:00:00Z'), status: 'ATRASADO', valorCentavos: 150000 }),
          // vence hoje: dentro da janela
          conta({ id: 'h', descricao: 'Internet', vencimento: new Date('2026-06-24T12:00:00Z'), valorCentavos: 9900 }),
          // próximos: depois do fim de hoje
          conta({ id: 'p', descricao: 'Cartão', vencimento: new Date('2026-06-27T12:00:00Z'), valorCentavos: 50000 }),
        ]),
      },
    });

    const r = await service.gerar(HOJE);

    expect(r.resumo.atrasadas).toBe(1);
    expect(r.resumo.venceHoje).toBe(1);
    expect(r.resumo.proximos).toBe(1);
    expect(r.temAlerta).toBe(true);
    expect(r.dia).toBe('24/06');

    // Totais somam por balde (em centavos).
    expect(r.resumo.totalAtrasadoCentavos).toBe(150000);
    expect(r.resumo.totalVenceHojeCentavos).toBe(9900);

    // Seções no texto.
    expect(r.texto).toContain('Atrasadas');
    expect(r.texto).toContain('Vencem hoje');
    expect(r.texto).toContain('Próximos');
    expect(r.texto).toContain('Aluguel');
    expect(r.texto).toContain('Internet');
    expect(r.texto).toContain('Cartão');
  });

  it('borda do dia: 24/06 00:00 SP (03:00Z) ainda é "vence hoje", não atrasada', async () => {
    const { service } = build({
      financeiro: {
        vencimentos: jest.fn().mockResolvedValue([
          conta({ id: 'borda', descricao: 'Meia-noite', vencimento: new Date('2026-06-24T03:00:00Z') }),
        ]),
      },
    });
    const r = await service.gerar(HOJE);
    expect(r.resumo.atrasadas).toBe(0);
    expect(r.resumo.venceHoje).toBe(1);
  });

  it('separa A pagar vs A receber no texto quando há dos dois', async () => {
    const { service } = build({
      financeiro: {
        vencimentos: jest.fn().mockResolvedValue([
          conta({ id: 'pg', descricao: 'Fornecedor', tipo: 'A_PAGAR', vencimento: new Date('2026-06-20T12:00:00Z'), valorCentavos: 30000 }),
          conta({ id: 'rc', descricao: 'Cliente X', tipo: 'A_RECEBER', vencimento: new Date('2026-06-21T12:00:00Z'), valorCentavos: 80000 }),
        ]),
      },
    });
    const r = await service.gerar(HOJE);
    expect(r.resumo.atrasadas).toBe(2);
    // total atrasado soma a_pagar + a_receber juntos
    expect(r.resumo.totalAtrasadoCentavos).toBe(110000);
    expect(r.texto).toContain('A pagar');
    expect(r.texto).toContain('A receber');
    expect(r.texto).toContain('Fornecedor');
    expect(r.texto).toContain('Cliente X');
  });

  it('respeita opt-out (flagAtiva=false → ativo=false, temAlerta=false, texto vazio)', async () => {
    const { service, deps } = build({
      repo: {
        tenantInfo: jest.fn().mockResolvedValue({ timezone: SP, whatsappNumber: '55' }),
        flagAtiva: jest.fn().mockResolvedValue(false),
      },
    });
    const r = await service.gerar(HOJE);
    expect(r.ativo).toBe(false);
    expect(r.temAlerta).toBe(false);
    expect(r.texto).toBe('');
    expect(r.numero).toBe('55');
    // não consulta o financeiro quando inativo (retorno cedo)
    expect((deps.financeiro.vencimentos as jest.Mock)).not.toHaveBeenCalled();
  });

  it('sem contas → temAlerta=false e texto vazio', async () => {
    const { service } = build();
    const r = await service.gerar(HOJE);
    expect(r.temAlerta).toBe(false);
    expect(r.resumo.atrasadas).toBe(0);
    expect(r.resumo.venceHoje).toBe(0);
    expect(r.resumo.proximos).toBe(0);
    expect(r.texto).toBe('');
  });

  it('"próximos" sozinho não dispara alerta (heads-up só com alerta ativo)', async () => {
    const { service } = build({
      financeiro: {
        vencimentos: jest.fn().mockResolvedValue([
          conta({ id: 'p', descricao: 'Futuro', vencimento: new Date('2026-06-27T12:00:00Z') }),
        ]),
      },
    });
    const r = await service.gerar(HOJE);
    expect(r.resumo.proximos).toBe(1);
    expect(r.temAlerta).toBe(false);
    expect(r.texto).toBe('');
  });

  it('renderiza moeda de centavos (90000 → "R$ 900,00"), nunca float', async () => {
    const { service } = build({
      financeiro: {
        vencimentos: jest.fn().mockResolvedValue([
          conta({ id: 'm', descricao: 'Salário', tipo: 'A_RECEBER', vencimento: new Date('2026-06-24T12:00:00Z'), valorCentavos: 90000 }),
        ]),
      },
    });
    const r = await service.gerar(HOJE);
    // fmtMoeda usa Intl pt-BR (separador NBSP entre R$ e o número) — compara via helper.
    expect(fmtMoeda(90000)).toMatch(/^R\$\s?900,00$/); // 90000 centavos = R$ 900,00
    expect(r.texto).toContain(fmtMoeda(90000));
    expect(r.resumo.totalVenceHojeCentavos).toBe(90000);
  });

  it('numero vem do tenantInfo', async () => {
    const { service } = build({
      repo: {
        tenantInfo: jest.fn().mockResolvedValue({ timezone: SP, whatsappNumber: '5543911112222' }),
        flagAtiva: jest.fn().mockResolvedValue(true),
      },
    });
    const r = await service.gerar(HOJE);
    expect(r.numero).toBe('5543911112222');
  });

  it('ordena contas por vencimento asc dentro de cada seção', async () => {
    const { service } = build({
      financeiro: {
        vencimentos: jest.fn().mockResolvedValue([
          conta({ id: 'a2', descricao: 'Segunda', vencimento: new Date('2026-06-22T12:00:00Z') }),
          conta({ id: 'a1', descricao: 'Primeira', vencimento: new Date('2026-06-20T12:00:00Z') }),
        ]),
      },
    });
    const r = await service.gerar(HOJE);
    expect(r.texto.indexOf('Primeira')).toBeLessThan(r.texto.indexOf('Segunda'));
  });

  it('trunca o texto em 2.000 chars com muitas contas (critério de aceite §4)', async () => {
    const muitas = Array.from({ length: 300 }, (_, i) =>
      conta({
        id: `x${i}`,
        descricao: `Conta número ${i} com um nome razoavelmente longo p/ estourar`,
        vencimento: new Date('2026-06-20T12:00:00Z'),
        status: 'ATRASADO',
        valorCentavos: 12345,
      }),
    );
    const { service } = build({
      financeiro: { vencimentos: jest.fn().mockResolvedValue(muitas) },
    });
    const r = await service.gerar(HOJE);
    expect(r.temAlerta).toBe(true);
    expect(r.texto.length).toBeLessThanOrEqual(2000);
  });
});
