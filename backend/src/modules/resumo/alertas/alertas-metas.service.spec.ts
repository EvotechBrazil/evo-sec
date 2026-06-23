import { MetaStatus } from '@prisma/client';
import { AlertaMetasService } from './alertas-metas.service';
import type { MetaEvolucao } from '../../financas/financas.service';

/**
 * Testes de unidade do AlertaMetasService com dependências mockadas (sem DB).
 * Foco (SPEC-004 §3.2): metas atrasadas, aporte sugerido (do banco e calculado),
 * disclaimer SEMPRE presente (guardrail do coach), opt-out, temAlerta e moeda em
 * centavos. Isolamento por tenant é garantido no ResumoRepository (já coberto em
 * resumo.repository.spec.ts) — aqui mockamos `evolucao()` à mão.
 */

const SP = 'America/Sao_Paulo';
const DATA = '2026-06-22'; // fixo p/ determinismo
const DISCLAIMER =
  'Conteúdo educativo, não é recomendação financeira regulada. A decisão é sua.';

/** Monta um MetaEvolucao completo (campos do Prisma + progresso/atrasada). */
function meta(over: Partial<MetaEvolucao> = {}): MetaEvolucao {
  const base: MetaEvolucao = {
    id: 'm-1',
    tenantId: 't-1',
    nome: 'Reserva de emergência',
    valorAlvoCentavos: 1_000_000,
    valorAtualCentavos: 200_000,
    prazo: null,
    aporteMensalSugeridoCent: null,
    alertaAtraso: true,
    status: MetaStatus.ATIVA,
    createdAt: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-01T12:00:00Z'),
    deletedAt: null,
    progressoPct: 20,
    atrasada: false,
  };
  return { ...base, ...over } as MetaEvolucao;
}

function build(metas: MetaEvolucao[], overrides: Partial<Record<string, unknown>> = {}) {
  const deps = {
    financas: {
      evolucao: jest.fn().mockResolvedValue({
        metas,
        totalInvestidoCentavos: 0,
        disclaimer: DISCLAIMER,
      }),
    },
    repo: {
      tenantInfo: jest
        .fn()
        .mockResolvedValue({ timezone: SP, whatsappNumber: '5543999999999' }),
      flagAtiva: jest.fn().mockResolvedValue(true),
    },
    ...overrides,
  };
  const service = new AlertaMetasService(deps.financas as never, deps.repo as never);
  return { service, deps };
}

describe('AlertaMetasService.gerar', () => {
  it('(a) meta atrasada aparece em metasAtrasadas e no texto (com progresso)', async () => {
    const { service } = build([
      meta({ nome: 'Viagem Europa', progressoPct: 12, atrasada: true, valorAtualCentavos: 120_000 }),
      meta({ nome: 'Reserva', progressoPct: 80, atrasada: false }),
    ]);

    const r = await service.gerar(DATA);

    expect(r.resumo.metasAtrasadas).toBe(1);
    expect(r.temAlerta).toBe(true);
    expect(r.texto).toContain('Atrás do ritmo');
    expect(r.texto).toContain('Viagem Europa');
    expect(r.texto).toContain('12%');
    expect(r.dia).toBe('22/06');
  });

  it('(b1) aporte sugerido usa aporteMensalSugeridoCent quando presente', async () => {
    const { service } = build([
      meta({ nome: 'Carro', aporteMensalSugeridoCent: 50_000, progressoPct: 30 }),
    ]);

    const r = await service.gerar(DATA);

    expect(r.resumo.aportesSugeridos).toBe(1);
    expect(r.resumo.totalAporteSugeridoCentavos).toBe(50_000);
    expect(r.texto).toContain('Carro');
    expect(r.texto).toContain('R$ 500,00'); // fmtMoeda usa NBSP entre R$ e valor
  });

  it('(b2) calcula aporte por (alvo-atual)/mesesRestantes quando não há sugestão mas há prazo', async () => {
    // falta 600.000 centavos; prazo ~6 meses após DATA → ~100.000/mês
    const { service } = build([
      meta({
        nome: 'Notebook',
        valorAlvoCentavos: 800_000,
        valorAtualCentavos: 200_000,
        aporteMensalSugeridoCent: null,
        prazo: new Date('2026-12-22T12:00:00Z'),
        progressoPct: 25,
      }),
    ]);

    const r = await service.gerar(DATA);

    expect(r.resumo.aportesSugeridos).toBe(1);
    // 600.000 / 6 = 100.000 centavos (R$ 1.000,00) — tolera arredondamento de meses
    expect(r.resumo.totalAporteSugeridoCentavos).toBeGreaterThanOrEqual(85_000);
    expect(r.resumo.totalAporteSugeridoCentavos).toBeLessThanOrEqual(120_000);
    expect(r.texto).toContain('Notebook');
  });

  it('(b3) sem prazo e sem sugestão → não entra em aportes', async () => {
    const { service } = build([
      meta({ nome: 'Sonho distante', aporteMensalSugeridoCent: null, prazo: null, progressoPct: 10 }),
    ]);

    const r = await service.gerar(DATA);

    expect(r.resumo.aportesSugeridos).toBe(0);
    expect(r.temAlerta).toBe(false);
  });

  it('(b4) ignora metas não-ATIVA ou já concluídas (progresso>=100) no aporte', async () => {
    const { service } = build([
      meta({ nome: 'Pausada', status: MetaStatus.PAUSADA, aporteMensalSugeridoCent: 30_000, progressoPct: 40 }),
      meta({ nome: 'Concluída', status: MetaStatus.ATIVA, aporteMensalSugeridoCent: 30_000, progressoPct: 100 }),
    ]);

    const r = await service.gerar(DATA);

    expect(r.resumo.aportesSugeridos).toBe(0);
    expect(r.resumo.totalAporteSugeridoCentavos).toBe(0);
  });

  it('(c) disclaimer SEMPRE presente no texto (em itálico) mesmo quando há alerta', async () => {
    const { service } = build([
      meta({ nome: 'Reserva', atrasada: true, progressoPct: 5 }),
    ]);

    const r = await service.gerar(DATA);

    expect(r.temAlerta).toBe(true);
    expect(r.texto).toContain(DISCLAIMER);
    expect(r.texto).toContain(`_${DISCLAIMER}_`); // itálico WhatsApp
  });

  it('(c2) disclaimer presente também quando NÃO há nada a alertar', async () => {
    const { service } = build([
      meta({ nome: 'No ritmo', atrasada: false, aporteMensalSugeridoCent: null, prazo: null, progressoPct: 50 }),
    ]);

    const r = await service.gerar(DATA);

    expect(r.temAlerta).toBe(false);
    expect(r.texto).toContain(`_${DISCLAIMER}_`);
  });

  it('(d) opt-out (flagAtiva=false) → ativo:false, temAlerta:false, texto vazio, sem chamar evolucao', async () => {
    const { service, deps } = build([meta({ atrasada: true })], {
      repo: {
        tenantInfo: jest.fn().mockResolvedValue({ timezone: SP, whatsappNumber: null }),
        flagAtiva: jest.fn().mockResolvedValue(false),
      },
    });

    const r = await service.gerar(DATA);

    expect(r.ativo).toBe(false);
    expect(r.temAlerta).toBe(false);
    expect(r.texto).toBe('');
    expect(r.numero).toBeNull();
    expect(deps.financas.evolucao).not.toHaveBeenCalled();
  });

  it('(e) sem metas relevantes → temAlerta:false', async () => {
    const { service } = build([]);

    const r = await service.gerar(DATA);

    expect(r.temAlerta).toBe(false);
    expect(r.resumo.metasAtrasadas).toBe(0);
    expect(r.resumo.aportesSugeridos).toBe(0);
    expect(r.ativo).toBe(true);
  });

  it('(f) moeda renderizada de inteiro de centavos (fmtMoeda)', async () => {
    const { service } = build([
      meta({ nome: 'Reforma', aporteMensalSugeridoCent: 123_456, progressoPct: 10 }),
    ]);

    const r = await service.gerar(DATA);

    expect(r.resumo.totalAporteSugeridoCentavos).toBe(123_456);
    expect(r.texto).toContain('R$ 1.234,56'); // 123456 centavos = R$ 1.234,56
  });
});
