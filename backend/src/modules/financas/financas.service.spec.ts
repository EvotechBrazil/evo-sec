import { NotFoundException } from '@nestjs/common';
import { MetaFinanceira, MetaStatus } from '@prisma/client';
import { FinancasService } from './financas.service';
import { FinancasRepository } from './financas.repository';
import { runWithTenant } from '../../common/tenant/tenant-context';

const meta = (over: Partial<MetaFinanceira> = {}): MetaFinanceira => ({
  id: 'm1',
  tenantId: 't1',
  nome: 'Reserva',
  valorAlvoCentavos: 100000,
  valorAtualCentavos: 0,
  prazo: null,
  aporteMensalSugeridoCent: null,
  alertaAtraso: true,
  status: MetaStatus.ATIVA,
  idempotencyKey: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  deletedAt: null,
  ...over,
});

describe('FinancasService.aportar (idempotência — SPEC-013)', () => {
  let service: FinancasService;
  let repo: { aportar: jest.Mock; findMeta: jest.Mock };

  beforeEach(() => {
    repo = {
      aportar: jest.fn(),
      findMeta: jest.fn(),
    };
    service = new FinancasService(repo as unknown as FinancasRepository);
  });

  it('repassa a idempotencyKey ao repositório', async () => {
    repo.aportar.mockResolvedValue({ count: 1, jaAplicado: false });
    repo.findMeta.mockResolvedValue(meta({ valorAtualCentavos: 5000 }));

    await service.aportar('m1', 5000, 'key-abc');

    expect(repo.aportar).toHaveBeenCalledWith('m1', 5000, 'key-abc');
  });

  it('reenvio (jaAplicado) é no-op: devolve o estado atual sem 404', async () => {
    repo.aportar.mockResolvedValue({ count: 0, jaAplicado: true });
    repo.findMeta.mockResolvedValue(meta({ valorAtualCentavos: 5000 }));

    const r = await service.aportar('m1', 5000, 'key-abc');

    expect(r.valorAtualCentavos).toBe(5000);
    expect(repo.findMeta).toHaveBeenCalledWith('m1');
  });

  it('meta inexistente (count 0, não aplicado) → 404', async () => {
    repo.aportar.mockResolvedValue({ count: 0, jaAplicado: false });

    await expect(service.aportar('nao-existe', 5000)).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.findMeta).not.toHaveBeenCalled();
  });

  it('sem idempotencyKey: comportamento atual (chama repo sem chave)', async () => {
    repo.aportar.mockResolvedValue({ count: 1, jaAplicado: false });
    repo.findMeta.mockResolvedValue(meta({ valorAtualCentavos: 3000 }));

    await service.aportar('m1', 3000);

    expect(repo.aportar).toHaveBeenCalledWith('m1', 3000, undefined);
  });
});

describe('FinancasRepository.aportar (dedup tenant-scoped — SPEC-013)', () => {
  let repo: FinancasRepository;
  let prisma: {
    metaFinanceira: { findFirst: jest.Mock; updateMany: jest.Mock };
  };

  const comTenant = <T>(fn: () => Promise<T>): Promise<T> =>
    runWithTenant({ tenantId: 't1' }, fn);

  beforeEach(() => {
    prisma = {
      metaFinanceira: {
        findFirst: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    repo = new FinancasRepository(prisma as never);
  });

  it('com chave inédita: incrementa E carimba a chave na meta (tenant-scoped)', async () => {
    prisma.metaFinanceira.findFirst.mockResolvedValue(null);

    const res = await comTenant(() => repo.aportar('m1', 5000, 'key-abc'));

    expect(prisma.metaFinanceira.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 't1', idempotencyKey: 'key-abc' },
      select: { id: true },
    });
    expect(prisma.metaFinanceira.updateMany).toHaveBeenCalledWith({
      where: { id: 'm1', tenantId: 't1', deletedAt: null },
      data: { valorAtualCentavos: { increment: 5000 }, idempotencyKey: 'key-abc' },
    });
    expect(res).toEqual({ count: 1, jaAplicado: false });
  });

  it('mesma chave 2x: 2ª chamada é no-op (NÃO incrementa de novo)', async () => {
    // 1ª: chave ainda não existe → increment normal e carimba.
    prisma.metaFinanceira.findFirst.mockResolvedValueOnce(null);
    const r1 = await comTenant(() => repo.aportar('m1', 5000, 'key-abc'));

    // 2ª: já existe meta com a chave → repetição.
    prisma.metaFinanceira.findFirst.mockResolvedValueOnce({ id: 'm1' });
    const r2 = await comTenant(() => repo.aportar('m1', 5000, 'key-abc'));

    expect(r1).toEqual({ count: 1, jaAplicado: false });
    expect(r2).toEqual({ count: 0, jaAplicado: true });
    // increment chamado UMA única vez no total (a repetição não tocou updateMany).
    expect(prisma.metaFinanceira.updateMany).toHaveBeenCalledTimes(1);
  });

  it('sem chave: increment direto, sem pré-check e sem carimbar idempotencyKey', async () => {
    const res = await comTenant(() => repo.aportar('m1', 7000));

    expect(prisma.metaFinanceira.findFirst).not.toHaveBeenCalled();
    expect(prisma.metaFinanceira.updateMany).toHaveBeenCalledWith({
      where: { id: 'm1', tenantId: 't1', deletedAt: null },
      data: { valorAtualCentavos: { increment: 7000 } },
    });
    expect(res).toEqual({ count: 1, jaAplicado: false });
  });

  it('sem chave: meta inexistente devolve count 0 / jaAplicado false (→ 404 no service)', async () => {
    prisma.metaFinanceira.updateMany.mockResolvedValue({ count: 0 });

    const res = await comTenant(() => repo.aportar('nao-existe', 7000));

    expect(res).toEqual({ count: 0, jaAplicado: false });
  });
});
