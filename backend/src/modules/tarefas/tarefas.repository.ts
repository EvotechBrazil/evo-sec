import { Injectable } from '@nestjs/common';
import { Prisma, Tarefa } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../common/tenant/tenant.util';

@Injectable()
export class TarefasRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Omit<Prisma.TarefaUncheckedCreateInput, 'tenantId'>): Promise<Tarefa> {
    return this.prisma.tarefa.create({ data: { ...data, tenantId: requireTenantId() } });
  }

  findMany(where: Prisma.TarefaWhereInput = {}): Promise<Tarefa[]> {
    return this.prisma.tarefa.findMany({
      where: { ...where, tenantId: requireTenantId(), deletedAt: null },
      orderBy: [{ prazo: 'asc' }, { createdAt: 'desc' }],
    });
  }

  findById(id: string): Promise<Tarefa | null> {
    return this.prisma.tarefa.findFirst({
      where: { id, tenantId: requireTenantId(), deletedAt: null },
    });
  }

  update(id: string, data: Prisma.TarefaUpdateInput): Promise<Prisma.BatchPayload> {
    return this.prisma.tarefa.updateMany({
      where: { id, tenantId: requireTenantId(), deletedAt: null },
      data,
    });
  }

  softDelete(id: string): Promise<Prisma.BatchPayload> {
    return this.prisma.tarefa.updateMany({
      where: { id, tenantId: requireTenantId(), deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
