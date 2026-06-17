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

  aportar(id: string, valorCentavos: number): Promise<Prisma.BatchPayload> {
    return this.prisma.metaFinanceira.updateMany({
      where: { id, tenantId: requireTenantId(), deletedAt: null },
      data: { valorAtualCentavos: { increment: valorCentavos } },
    });
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
