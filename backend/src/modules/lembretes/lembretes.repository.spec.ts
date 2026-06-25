import { LembretesRepository } from './lembretes.repository';
import { runWithTenant } from '../../common/tenant/tenant-context';

const TENANT = '00000000-0000-0000-0000-000000000001';

function build() {
  const prisma = {
    lembrete: {
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  return { repo: new LembretesRepository(prisma as never), prisma };
}

describe('LembretesRepository — disparo (guarda de tenant)', () => {
  it('findDue exige contexto de tenant', () => {
    const { repo } = build();
    expect(() => repo.findDue(new Date())).toThrow(/Tenant/);
  });

  it('findDue filtra dataHora<=now + PENDENTE + tenantId + deletedAt', async () => {
    const { repo, prisma } = build();
    const now = new Date('2026-06-25T12:00:00Z');
    await runWithTenant({ tenantId: TENANT }, async () => {
      await repo.findDue(now);
    });
    expect(prisma.lembrete.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT,
          deletedAt: null,
          status: 'PENDENTE',
          dataHora: { lte: now },
        }),
      }),
    );
  });

  it('aplicarDisparo exige contexto de tenant', async () => {
    const { repo } = build();
    await expect(repo.aplicarDisparo(['a'], [])).rejects.toThrow(/Tenant/);
  });

  it('aplicarDisparo: terminais + avanços numa transação, tenant-scoped', async () => {
    const { repo, prisma } = build();
    const proxima = new Date('2026-07-01T12:00:00Z');
    await runWithTenant({ tenantId: TENANT }, async () => {
      await repo.aplicarDisparo(['a'], [{ id: 'b', proxima }]);
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.lembrete.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ['a'] }, tenantId: TENANT, deletedAt: null }),
        data: { status: 'NOTIFICADO', notificado: true },
      }),
    );
    expect(prisma.lembrete.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'b', tenantId: TENANT, deletedAt: null }),
        data: { dataHora: proxima },
      }),
    );
  });

  it('aplicarDisparo: nada a fazer → não abre transação', async () => {
    const { repo, prisma } = build();
    await runWithTenant({ tenantId: TENANT }, async () => {
      await repo.aplicarDisparo([], []);
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
