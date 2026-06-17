import { Injectable } from '@nestjs/common';
import { Prisma, UsoLlm } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../common/tenant/tenant.util';

@Injectable()
export class CustoRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Omit<Prisma.UsoLlmUncheckedCreateInput, 'tenantId'>): Promise<UsoLlm> {
    return this.prisma.usoLlm.create({ data: { ...data, tenantId: requireTenantId() } });
  }

  findRecentes(take = 50): Promise<UsoLlm[]> {
    return this.prisma.usoLlm.findMany({
      where: { tenantId: requireTenantId() },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async resumo(desde: Date): Promise<{ custoMicroUsd: number; tokensIn: number; tokensOut: number }> {
    const agg = await this.prisma.usoLlm.aggregate({
      _sum: { custoMicroUsd: true, tokensIn: true, tokensOut: true },
      where: { tenantId: requireTenantId(), createdAt: { gte: desde } },
    });
    return {
      custoMicroUsd: agg._sum.custoMicroUsd ?? 0,
      tokensIn: agg._sum.tokensIn ?? 0,
      tokensOut: agg._sum.tokensOut ?? 0,
    };
  }

  async porModelo(desde: Date): Promise<{ modelo: string; custoMicroUsd: number }[]> {
    const rows = await this.prisma.usoLlm.groupBy({
      by: ['modelo'],
      _sum: { custoMicroUsd: true },
      where: { tenantId: requireTenantId(), createdAt: { gte: desde } },
    });
    return rows.map((r) => ({ modelo: r.modelo, custoMicroUsd: r._sum.custoMicroUsd ?? 0 }));
  }
}
