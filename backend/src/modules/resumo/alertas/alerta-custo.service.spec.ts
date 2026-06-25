import { AlertaCustoService } from './alerta-custo.service';
import type { ResumoCusto } from '../../custo/custo.service';

/**
 * Testes de unidade do AlertaCustoService (SPEC-012 §2 — slice 14D) com
 * dependências mockadas (sem DB). Foco: opt-out, temAlerta quando custo > teto,
 * sem alerta quando <= teto e formatação em US$ (não R$). Teto = US$5,00/dia
 * (5_000_000 micro-USD). Isolamento por tenant é garantido no ResumoRepository
 * (ver resumo.repository.spec.ts).
 */

const SP = 'America/Sao_Paulo';
const TETO = 5_000_000; // US$5,00/dia

function resumoCusto(over: Partial<ResumoCusto> = {}): ResumoCusto {
  return {
    custoMicroUsd: 0,
    tokensIn: 0,
    tokensOut: 0,
    porModelo: [],
    ...over,
  };
}

function build(overrides: Partial<Record<string, unknown>> = {}) {
  const deps = {
    custo: { resumo: jest.fn().mockResolvedValue(resumoCusto()) },
    repo: {
      tenantInfo: jest
        .fn()
        .mockResolvedValue({ timezone: SP, whatsappNumber: '5543999999999' }),
      flagAtiva: jest.fn().mockResolvedValue(true),
    },
    ...overrides,
  };
  const service = new AlertaCustoService(deps.custo as never, deps.repo as never);
  return { service, deps };
}

describe('AlertaCustoService.gerar', () => {
  it('respeita opt-out (flagAtiva=false → ativo=false, temAlerta=false, texto vazio)', async () => {
    const { service, deps } = build({
      custo: {
        resumo: jest
          .fn()
          .mockResolvedValue(resumoCusto({ custoMicroUsd: 9_000_000 })),
      },
      repo: {
        tenantInfo: jest.fn().mockResolvedValue({ timezone: SP, whatsappNumber: '55' }),
        flagAtiva: jest.fn().mockResolvedValue(false),
      },
    });

    const r = await service.gerar();

    expect(r.ativo).toBe(false);
    expect(r.temAlerta).toBe(false);
    expect(r.texto).toBe('');
    expect(r.numero).toBe('55');
    expect(r.tetoMicroUsd).toBe(TETO);
    expect(deps.repo.flagAtiva).toHaveBeenCalledWith('alerta_custo_ativo');
    // não consulta o custo quando inativo (retorno cedo)
    expect((deps.custo.resumo as jest.Mock)).not.toHaveBeenCalled();
  });

  it('temAlerta=true quando custo > teto (US$5/dia)', async () => {
    const { service, deps } = build({
      custo: {
        resumo: jest.fn().mockResolvedValue(
          resumoCusto({
            custoMicroUsd: 7_500_000, // US$7,50 > US$5,00
            porModelo: [
              { modelo: 'anthropic/claude-sonnet-4.6', custoMicroUsd: 5_000_000 },
              { modelo: 'google/gemini-2.5-flash', custoMicroUsd: 2_500_000 },
            ],
          }),
        ),
      },
    });

    const r = await service.gerar();

    expect(r.ativo).toBe(true);
    expect(r.temAlerta).toBe(true);
    expect(r.custoMicroUsd).toBe(7_500_000);
    expect(r.tetoMicroUsd).toBe(TETO);
    expect(r.texto).toContain('US$ 7.50');
    expect(r.texto).toContain('US$ 5.00'); // teto citado
    // top modelos no texto
    expect(r.texto).toContain('anthropic/claude-sonnet-4.6');
    expect(r.texto).toContain('google/gemini-2.5-flash');
  });

  it('temAlerta=false quando custo <= teto (texto vazio)', async () => {
    const { service } = build({
      custo: {
        resumo: jest.fn().mockResolvedValue(
          resumoCusto({ custoMicroUsd: TETO }), // exatamente no teto → NÃO dispara (> estrito)
        ),
      },
    });

    const r = await service.gerar();

    expect(r.ativo).toBe(true);
    expect(r.temAlerta).toBe(false);
    expect(r.custoMicroUsd).toBe(TETO);
    expect(r.texto).toBe('');
  });

  it('formata em US$ com 2 casas (custoMicroUsd / 1_000_000), nunca R$', async () => {
    const { service } = build({
      custo: {
        resumo: jest
          .fn()
          .mockResolvedValue(resumoCusto({ custoMicroUsd: 12_340_000 })), // US$12,34
      },
    });

    const r = await service.gerar();

    expect(r.texto).toContain('US$ 12.34');
    expect(r.texto).not.toContain('R$'); // moeda é US$, não BRL
  });

  it('repassa o parâmetro dias ao CustoService (default = 1 = hoje)', async () => {
    const { service, deps } = build();

    await service.gerar();
    expect(deps.custo.resumo).toHaveBeenCalledWith(1);

    await service.gerar(7);
    expect(deps.custo.resumo).toHaveBeenLastCalledWith(7);
  });

  it('numero e dia vêm do tenantInfo (whatsappNumber + tz)', async () => {
    const { service } = build({
      repo: {
        tenantInfo: jest
          .fn()
          .mockResolvedValue({ timezone: SP, whatsappNumber: '5511888887777' }),
        flagAtiva: jest.fn().mockResolvedValue(true),
      },
    });

    const r = await service.gerar();
    expect(r.numero).toBe('5511888887777');
    // dia é "DD/MM" no tz do tenant (não testamos o valor exato p/ não depender de relógio).
    expect(r.dia).toMatch(/^\d{2}\/\d{2}$/);
  });
});
