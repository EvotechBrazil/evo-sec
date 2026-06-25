import { ContaTipo, Prisma } from '@prisma/client';
import { FinanceiroRepository } from './financeiro.repository';
import { runWithTenant } from '../../common/tenant/tenant-context';

const TENANT = '00000000-0000-0000-0000-000000000001';

function build(tenantRow: { timezone: string } | null) {
  const prisma = {
    tenant: { findFirst: jest.fn().mockResolvedValue(tenantRow) },
  };
  return { repo: new FinanceiroRepository(prisma as never), prisma };
}

describe('FinanceiroRepository.tenantTimezone (SPEC-011)', () => {
  it('exige contexto de tenant', async () => {
    const { repo } = build({ timezone: 'America/Sao_Paulo' });
    await expect(repo.tenantTimezone()).rejects.toThrow(/Tenant/);
  });

  it('retorna o timezone do tenant, filtrando por tenantId + deletedAt', async () => {
    const { repo, prisma } = build({ timezone: 'America/New_York' });
    const tz = await runWithTenant({ tenantId: TENANT }, () => repo.tenantTimezone());
    expect(tz).toBe('America/New_York');
    expect(prisma.tenant.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: TENANT, deletedAt: null }),
        select: { timezone: true },
      }),
    );
  });

  it('default America/Sao_Paulo quando tenant/timezone ausente', async () => {
    const { repo } = build(null);
    const tz = await runWithTenant({ tenantId: TENANT }, () => repo.tenantTimezone());
    expect(tz).toBe('America/Sao_Paulo');
  });
});

describe('FinanceiroRepository.create — idempotência (SPEC-013)', () => {
  function buildCreate(existente: { id: string } | null) {
    const prisma = {
      conta: {
        findFirst: jest.fn().mockResolvedValue(existente),
        create: jest.fn().mockResolvedValue({ id: 'novo' }),
      },
    };
    return { repo: new FinanceiroRepository(prisma as never), prisma };
  }

  const dadosConta: Omit<Prisma.ContaUncheckedCreateInput, 'tenantId'> = {
    tipo: ContaTipo.A_PAGAR,
    descricao: 'aluguel',
    valorCentavos: 100,
    vencimento: new Date('2026-06-30T15:00:00.000Z'),
  };

  it('com idempotencyKey já existente → devolve o existente e NÃO chama conta.create', async () => {
    const { repo, prisma } = buildCreate({ id: 'ja-existe' });
    const r = await runWithTenant({ tenantId: TENANT }, () =>
      repo.create({ ...dadosConta, idempotencyKey: 'evt-123' }),
    );
    expect(r).toEqual({ id: 'ja-existe' });
    expect(prisma.conta.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT,
          idempotencyKey: 'evt-123',
          deletedAt: null,
        }),
      }),
    );
    expect(prisma.conta.create).not.toHaveBeenCalled();
  });

  it('com idempotencyKey inédita (findFirst null) → cria normalmente', async () => {
    const { repo, prisma } = buildCreate(null);
    const r = await runWithTenant({ tenantId: TENANT }, () =>
      repo.create({ ...dadosConta, idempotencyKey: 'evt-novo' }),
    );
    expect(r).toEqual({ id: 'novo' });
    expect(prisma.conta.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.conta.create).toHaveBeenCalledTimes(1);
    expect(prisma.conta.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ idempotencyKey: 'evt-novo', tenantId: TENANT }),
      }),
    );
  });

  it('sem idempotencyKey → pula o pré-check e chama conta.create (comportamento atual)', async () => {
    const { repo, prisma } = buildCreate({ id: 'nao-deveria-ser-usado' });
    const r = await runWithTenant({ tenantId: TENANT }, () => repo.create(dadosConta));
    expect(r).toEqual({ id: 'novo' });
    expect(prisma.conta.findFirst).not.toHaveBeenCalled();
    expect(prisma.conta.create).toHaveBeenCalledTimes(1);
  });
});
