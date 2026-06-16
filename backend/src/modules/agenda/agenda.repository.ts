import { Injectable } from '@nestjs/common';
import { Compromisso, CompromissoStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../common/tenant/tenant.util';

const ATIVOS: CompromissoStatus[] = [
  CompromissoStatus.CONFIRMADO,
  CompromissoStatus.TENTATIVO,
];

@Injectable()
export class AgendaRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Omit<Prisma.CompromissoUncheckedCreateInput, 'tenantId'>): Promise<Compromisso> {
    return this.prisma.compromisso.create({ data: { ...data, tenantId: requireTenantId() } });
  }

  /** Compromissos ativos que se sobrepõem ao intervalo [inicio, fim). */
  findOverlapping(inicio: Date, fim: Date): Promise<Compromisso[]> {
    return this.prisma.compromisso.findMany({
      where: {
        tenantId: requireTenantId(),
        deletedAt: null,
        status: { in: ATIVOS },
        inicio: { lt: fim },
        OR: [
          { fim: { gt: inicio } },
          { fim: null, inicio: { gte: inicio } },
        ],
      },
      orderBy: { inicio: 'asc' },
    });
  }

  findUpcoming(desde: Date): Promise<Compromisso[]> {
    return this.prisma.compromisso.findMany({
      where: {
        tenantId: requireTenantId(),
        deletedAt: null,
        status: { in: ATIVOS },
        inicio: { gte: desde },
      },
      orderBy: { inicio: 'asc' },
      take: 100,
    });
  }

  findById(id: string): Promise<Compromisso | null> {
    return this.prisma.compromisso.findFirst({
      where: { id, tenantId: requireTenantId(), deletedAt: null },
    });
  }

  update(id: string, data: Prisma.CompromissoUpdateInput): Promise<Prisma.BatchPayload> {
    return this.prisma.compromisso.updateMany({
      where: { id, tenantId: requireTenantId(), deletedAt: null },
      data,
    });
  }

  softDelete(id: string): Promise<Prisma.BatchPayload> {
    return this.prisma.compromisso.updateMany({
      where: { id, tenantId: requireTenantId(), deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
