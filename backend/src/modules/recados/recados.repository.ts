import { Injectable } from '@nestjs/common';
import { Prisma, Recado } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../common/tenant/tenant.util';

/**
 * Acesso a dados de Recado. Toda query é filtrada por tenantId (defesa em
 * profundidade na camada de aplicação, além da RLS no banco — ADR-001).
 */
@Injectable()
export class RecadosRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Omit<Prisma.RecadoUncheckedCreateInput, 'tenantId'>): Promise<Recado> {
    return this.prisma.recado.create({ data: { ...data, tenantId: requireTenantId() } });
  }

  findMany(): Promise<Recado[]> {
    return this.prisma.recado.findMany({
      where: { tenantId: requireTenantId(), deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string): Promise<Recado | null> {
    return this.prisma.recado.findFirst({
      where: { id, tenantId: requireTenantId(), deletedAt: null },
    });
  }

  update(id: string, data: Prisma.RecadoUpdateInput): Promise<Prisma.BatchPayload> {
    return this.prisma.recado.updateMany({
      where: { id, tenantId: requireTenantId(), deletedAt: null },
      data,
    });
  }

  softDelete(id: string): Promise<Prisma.BatchPayload> {
    return this.prisma.recado.updateMany({
      where: { id, tenantId: requireTenantId(), deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
