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
