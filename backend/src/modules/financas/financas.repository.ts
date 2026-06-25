import { Injectable } from '@nestjs/common';
import { Investimento, MetaFinanceira, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../common/tenant/tenant.util';

@Injectable()
export class FinancasRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Metas ----
  createMeta(data: Omit<Prisma.MetaFinanceiraUncheckedCreateInput, 'tenantId'>): Promise<MetaFinanceira> {
    return this.prisma.metaFinanceira.create({ data: { ...data, tenantId: requireTenantId() } });
  }

  listMetas(): Promise<MetaFinanceira[]> {
    return this.prisma.metaFinanceira.findMany({
      where: { tenantId: requireTenantId(), deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  findMeta(id: string): Promise<MetaFinanceira | null> {
    return this.prisma.metaFinanceira.findFirst({
      where: { id, tenantId: requireTenantId(), deletedAt: null },
    });
  }

  updateMeta(id: string, data: Prisma.MetaFinanceiraUpdateInput): Promise<Prisma.BatchPayload> {
    return this.prisma.metaFinanceira.updateMany({
      where: { id, tenantId: requireTenantId(), deletedAt: null },
      data,
    });
  }

  /**
   * Aplica um aporte (increment) na meta.
   *
   * Idempotência (SPEC-013): quando `idempotencyKey` é informada, faz pré-check
   * tenant-scoped (`@@unique([tenantId, idempotencyKey])`). Se já existir uma meta
   * carregando essa chave, o aporte já foi aplicado antes → **no-op** (não
   * incrementa de novo) e devolve `{ count: 0, jaAplicado: true }`. Caso contrário
   * incrementa e carimba a chave na própria meta, na mesma operação.
   *
   * Sem chave → comportamento atual (apenas increment).
   *
   * Distinção importante p/ o service: `count: 0 + jaAplicado: false` = meta
   * inexistente (404); `count: 0 + jaAplicado: true` = repetição (devolve estado atual).
   */
  async aportar(
    id: string,
    valorCentavos: number,
    idempotencyKey?: string,
  ): Promise<{ count: number; jaAplicado: boolean }> {
    const tenantId = requireTenantId();

    if (idempotencyKey) {
      const existente = await this.prisma.metaFinanceira.findFirst({
        where: { tenantId, idempotencyKey },
        select: { id: true },
      });
      if (existente) {
        // Reenvio da mesma chave: aporte já contabilizado, não soma de novo.
        return { count: 0, jaAplicado: true };
      }
    }

    const res = await this.prisma.metaFinanceira.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: {
        valorAtualCentavos: { increment: valorCentavos },
        ...(idempotencyKey ? { idempotencyKey } : {}),
      },
    });
    return { count: res.count, jaAplicado: false };
  }

  // ---- Investimentos ----
  createInvestimento(
    data: Omit<Prisma.InvestimentoUncheckedCreateInput, 'tenantId'>,
  ): Promise<Investimento> {
    return this.prisma.investimento.create({ data: { ...data, tenantId: requireTenantId() } });
  }

  listInvestimentos(): Promise<Investimento[]> {
    return this.prisma.investimento.findMany({
      where: { tenantId: requireTenantId(), deletedAt: null },
      orderBy: { dataAplicacao: 'desc' },
    });
  }

  async totalInvestidoCentavos(): Promise<number> {
    const agg = await this.prisma.investimento.aggregate({
      _sum: { valorAplicadoCent: true },
      where: { tenantId: requireTenantId(), deletedAt: null },
    });
    return agg._sum.valorAplicadoCent ?? 0;
  }
}
