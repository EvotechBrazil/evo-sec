import { Injectable } from '@nestjs/common';
import { Categoria, Conta, ContaStatus, ContaTipo, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../common/tenant/tenant.util';

export type ContaComCategoria = Conta & { categoriaRef: Categoria | null };

@Injectable()
export class FinanceiroRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Omit<Prisma.ContaUncheckedCreateInput, 'tenantId'>): Promise<Conta> {
    return this.prisma.conta.create({ data: { ...data, tenantId: requireTenantId() } });
  }

  findMany(where: Prisma.ContaWhereInput = {}): Promise<Conta[]> {
    return this.prisma.conta.findMany({
      where: { ...where, tenantId: requireTenantId(), deletedAt: null },
      orderBy: { vencimento: 'asc' },
    });
  }

  findById(id: string): Promise<Conta | null> {
    return this.prisma.conta.findFirst({
      where: { id, tenantId: requireTenantId(), deletedAt: null },
    });
  }

  update(id: string, data: Prisma.ContaUpdateInput): Promise<Prisma.BatchPayload> {
    return this.prisma.conta.updateMany({
      where: { id, tenantId: requireTenantId(), deletedAt: null },
      data,
    });
  }

  softDelete(id: string): Promise<Prisma.BatchPayload> {
    return this.prisma.conta.updateMany({
      where: { id, tenantId: requireTenantId(), deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  /** Soma de centavos por tipo, considerando apenas contas quitadas no período. */
  async somaQuitadas(tipo: ContaTipo, inicio: Date, fim: Date): Promise<number> {
    const statusQuitado = tipo === ContaTipo.A_RECEBER ? ContaStatus.RECEBIDO : ContaStatus.PAGO;
    const agg = await this.prisma.conta.aggregate({
      _sum: { valorCentavos: true },
      where: {
        tenantId: requireTenantId(),
        deletedAt: null,
        tipo,
        status: statusQuitado,
        pagoEm: { gte: inicio, lte: fim },
      },
    });
    return agg._sum.valorCentavos ?? 0;
  }

  /** Soma de centavos em aberto (pendente/atrasado) por tipo — backlog de contas a pagar/receber. */
  async somaPendentes(tipo: ContaTipo): Promise<number> {
    const agg = await this.prisma.conta.aggregate({
      _sum: { valorCentavos: true },
      where: {
        tenantId: requireTenantId(),
        deletedAt: null,
        tipo,
        status: { in: [ContaStatus.PENDENTE, ContaStatus.ATRASADO] },
      },
    });
    return agg._sum.valorCentavos ?? 0;
  }

  /** Contas quitadas no período, com a categoria carregada (base da DRE / breakdown). */
  quitadasNoPeriodo(inicio: Date, fim: Date): Promise<ContaComCategoria[]> {
    return this.prisma.conta.findMany({
      where: {
        tenantId: requireTenantId(),
        deletedAt: null,
        status: { in: [ContaStatus.PAGO, ContaStatus.RECEBIDO] },
        pagoEm: { gte: inicio, lte: fim },
      },
      include: { categoriaRef: true },
      orderBy: { pagoEm: 'desc' },
    });
  }

  /** Contas em aberto (pendente/atrasado), opcionalmente por tipo. */
  pendentes(tipo?: ContaTipo): Promise<Conta[]> {
    return this.prisma.conta.findMany({
      where: {
        tenantId: requireTenantId(),
        deletedAt: null,
        status: { in: [ContaStatus.PENDENTE, ContaStatus.ATRASADO] },
        ...(tipo ? { tipo } : {}),
      },
      orderBy: { vencimento: 'asc' },
    });
  }

  /** Contas pendentes vencendo até `ate` (inclui vencidas). */
  vencimentos(ate: Date): Promise<Conta[]> {
    return this.prisma.conta.findMany({
      where: {
        tenantId: requireTenantId(),
        deletedAt: null,
        status: { in: [ContaStatus.PENDENTE, ContaStatus.ATRASADO] },
        vencimento: { lte: ate },
      },
      orderBy: { vencimento: 'asc' },
    });
  }
}
