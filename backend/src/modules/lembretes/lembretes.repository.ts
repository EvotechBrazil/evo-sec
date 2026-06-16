import { Injectable } from '@nestjs/common';
import { Lembrete, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../common/tenant/tenant.util';

@Injectable()
export class LembretesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Omit<Prisma.LembreteUncheckedCreateInput, 'tenantId'>): Promise<Lembrete> {
    return this.prisma.lembrete.create({ data: { ...data, tenantId: requireTenantId() } });
  }

  findMany(where: Prisma.LembreteWhereInput = {}): Promise<Lembrete[]> {
    return this.prisma.lembrete.findMany({
      where: { ...where, tenantId: requireTenantId(), deletedAt: null },
      orderBy: { dataHora: 'asc' },
    });
  }

  findById(id: string): Promise<Lembrete | null> {
    return this.prisma.lembrete.findFirst({
      where: { id, tenantId: requireTenantId(), deletedAt: null },
    });
  }

  update(id: string, data: Prisma.LembreteUpdateInput): Promise<Prisma.BatchPayload> {
    return this.prisma.lembrete.updateMany({
      where: { id, tenantId: requireTenantId(), deletedAt: null },
      data,
    });
  }

  softDelete(id: string): Promise<Prisma.BatchPayload> {
    return this.prisma.lembrete.updateMany({
      where: { id, tenantId: requireTenantId(), deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
