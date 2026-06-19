import { ResumoRepository } from './resumo.repository';
import { runWithTenant } from '../../common/tenant/tenant-context';

/**
 * Garante o isolamento por tenant na camada de aplicação: nenhuma query roda
 * fora de um contexto de tenant, e quando há contexto o tenantId é propagado
 * para o Prisma (defesa em profundidade além da RLS — ADR-001).
 */
describe('ResumoRepository (guarda de tenant)', () => {
  const TENANT = '00000000-0000-0000-0000-000000000001';

  function build() {
    const prisma = {
      contatoVip: { findMany: jest.fn().mockResolvedValue([]) },
      tenant: { findFirst: jest.fn().mockResolvedValue({ timezone: 'America/Sao_Paulo', whatsappNumber: '55' }) },
      config: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    return { repo: new ResumoRepository(prisma as never), prisma };
  }

  it('lança/rejeita quando não há contexto de tenant (não roda query unscoped)', async () => {
    const { repo, prisma } = build();
    expect(() => repo.listVips()).toThrow(/Tenant/);
    await expect(repo.tenantInfo()).rejects.toThrow(/Tenant/);
    await expect(repo.flagAtiva('x')).rejects.toThrow(/Tenant/);
    expect(prisma.contatoVip.findMany).not.toHaveBeenCalled();
  });

  it('propaga o tenantId do contexto para o Prisma', async () => {
    const { repo, prisma } = build();
    await runWithTenant({ tenantId: TENANT }, async () => {
      await repo.listVips();
      await repo.tenantInfo();
    });
    expect(prisma.contatoVip.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT }) }),
    );
    expect(prisma.tenant.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: TENANT }) }),
    );
  });

  it('flagAtiva: ausente=ativo (true); "false"=inativo', async () => {
    const { repo, prisma } = build();
    await runWithTenant({ tenantId: TENANT }, async () => {
      expect(await repo.flagAtiva('digest_diario_ativo')).toBe(true);
      prisma.config.findUnique.mockResolvedValueOnce({ valor: 'false' });
      expect(await repo.flagAtiva('digest_diario_ativo')).toBe(false);
    });
  });
});
