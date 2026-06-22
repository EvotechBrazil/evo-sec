import { Injectable } from '@nestjs/common';
import { Categoria, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../common/tenant/tenant.util';

@Injectable()
export class CategoriasRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Omit<Prisma.CategoriaUncheckedCreateInput, 'tenantId'>): Promise<Categoria> {
    return this.prisma.categoria.create({ data: { ...data, tenantId: requireTenantId() } });
  }

  findMany(where: Prisma.CategoriaWhereInput = {}): Promise<Categoria[]> {
    return this.prisma.categoria.findMany({
      where: { ...where, tenantId: requireTenantId(), deletedAt: null },
      orderBy: [{ tipo: 'asc' }, { nome: 'asc' }],
    });
  }

  findById(id: string): Promise<Categoria | null> {
    return this.prisma.categoria.findFirst({
      where: { id, tenantId: requireTenantId(), deletedAt: null },
    });
  }

  update(id: string, data: Prisma.CategoriaUpdateInput): Promise<Prisma.BatchPayload> {
    return this.prisma.categoria.updateMany({
      where: { id, tenantId: requireTenantId(), deletedAt: null },
      data,
    });
  }

  softDelete(id: string): Promise<Prisma.BatchPayload> {
    return this.prisma.categoria.updateMany({
      where: { id, tenantId: requireTenantId(), deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
