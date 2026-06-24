import { ContextoRole } from '@prisma/client';
import { ContextoRepository, JANELA_MIN } from './contexto.repository';
import { runWithTenant } from '../../common/tenant/tenant-context';

/**
 * Isolamento por tenant na camada de aplicação (SPEC-006): nenhuma query de
 * `Sessao`/`Contexto` roda fora de um contexto de tenant; quando há contexto o
 * tenantId é propagado ao Prisma (defesa em profundidade além da RLS — ADR-001).
 */
describe('ContextoRepository (guarda de tenant)', () => {
  const TENANT = '00000000-0000-0000-0000-000000000001';

  function build() {
    const prisma = {
      sessao: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'nova', ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      contexto: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    return { repo: new ContextoRepository(prisma as never), prisma };
  }

  it('lança/rejeita quando não há contexto de tenant (não roda query unscoped)', async () => {
    const { repo, prisma } = build();
    // métodos síncronos avaliam requireTenantId() antes de criar a promise → throw
    expect(() => repo.sessaoAtivaParaLeitura()).toThrow(/Tenant/);
    expect(() => repo.ultimas('s1', 8)).toThrow(/Tenant/);
    // métodos async rejeitam a promise
    await expect(repo.sessaoAtivaParaEscrita()).rejects.toThrow(/Tenant/);
    await expect(repo.append('s1', ContextoRole.USER, 'oi')).rejects.toThrow(/Tenant/);
    expect(prisma.sessao.findFirst).not.toHaveBeenCalled();
    expect(prisma.contexto.create).not.toHaveBeenCalled();
  });

  it('sessaoAtivaParaLeitura: filtra tenant + ativa + janela não expirada, ordena desc', async () => {
    const { repo, prisma } = build();
    await runWithTenant({ tenantId: TENANT }, async () => {
      await repo.sessaoAtivaParaLeitura();
    });
    const arg = prisma.sessao.findFirst.mock.calls[0][0];
    expect(arg.where).toEqual(
      expect.objectContaining({ tenantId: TENANT, ativa: true, expiraEm: { gt: expect.any(Date) } }),
    );
    expect(arg.orderBy).toEqual({ expiraEm: 'desc' });
  });

  it('sessaoAtivaParaEscrita: cria sessão (ativa+janela 30min) quando não há ativa', async () => {
    const { repo, prisma } = build();
    const antes = Date.now();
    const sessao = await runWithTenant({ tenantId: TENANT }, () => repo.sessaoAtivaParaEscrita());
    expect(prisma.sessao.updateMany).not.toHaveBeenCalled();
    const data = prisma.sessao.create.mock.calls[0][0].data;
    expect(data).toEqual(
      expect.objectContaining({ tenantId: TENANT, ativa: true, abertaEm: expect.any(Date), expiraEm: expect.any(Date) }),
    );
    // janela ~= agora + 30 min
    const janelaMs = data.expiraEm.getTime() - data.abertaEm.getTime();
    expect(janelaMs).toBe(JANELA_MIN * 60_000);
    expect(data.expiraEm.getTime()).toBeGreaterThanOrEqual(antes + JANELA_MIN * 60_000 - 1000);
    expect(sessao.id).toBe('nova');
  });

  it('sessaoAtivaParaEscrita: estende a janela (+30min) da sessão ativa existente', async () => {
    const { repo, prisma } = build();
    prisma.sessao.findFirst.mockResolvedValueOnce({ id: 's-existente', tenantId: TENANT, ativa: true });
    const antes = Date.now();
    const sessao = await runWithTenant({ tenantId: TENANT }, () => repo.sessaoAtivaParaEscrita());
    expect(prisma.sessao.create).not.toHaveBeenCalled();
    const callArg = prisma.sessao.updateMany.mock.calls[0][0];
    expect(callArg.where).toEqual({ id: 's-existente', tenantId: TENANT });
    expect(callArg.data.expiraEm.getTime()).toBeGreaterThanOrEqual(antes + JANELA_MIN * 60_000 - 1000);
    expect(sessao.id).toBe('s-existente');
  });

  it('append: cria Contexto com tenantId do contexto + role/conteudo', async () => {
    const { repo, prisma } = build();
    await runWithTenant({ tenantId: TENANT }, () => repo.append('s1', ContextoRole.ASSISTANT, 'feito'));
    expect(prisma.contexto.create).toHaveBeenCalledWith({
      data: { tenantId: TENANT, sessaoId: 's1', role: ContextoRole.ASSISTANT, conteudo: 'feito' },
    });
  });

  it('ultimas: filtra tenant+sessao, ordena createdAt desc e aplica take=limite', async () => {
    const { repo, prisma } = build();
    await runWithTenant({ tenantId: TENANT }, () => repo.ultimas('s1', 5));
    expect(prisma.contexto.findMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT, sessaoId: 's1' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
  });
});
