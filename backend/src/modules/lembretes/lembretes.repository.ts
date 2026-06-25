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

  /** Lembretes vencidos (`dataHora <= now`) e ainda pendentes — tenant-scoped. */
  findDue(now: Date): Promise<Lembrete[]> {
    return this.findMany({ dataHora: { lte: now }, status: 'PENDENTE' });
  }

  /**
   * Aplica o disparo numa transação (tenant-scoped):
   * - terminais (não-recorrentes) → `status=NOTIFICADO` + `notificado=true` (encerram);
   * - avanços (recorrentes) → `dataHora` = próxima ocorrência futura (seguem `PENDENTE`).
   */
  async aplicarDisparo(
    terminaisIds: string[],
    avancos: { id: string; proxima: Date }[],
  ): Promise<void> {
    const tenantId = requireTenantId();
    const ops: Prisma.PrismaPromise<Prisma.BatchPayload>[] = [];
    if (terminaisIds.length > 0) {
      ops.push(
        this.prisma.lembrete.updateMany({
          where: { id: { in: terminaisIds }, tenantId, deletedAt: null },
          data: { status: 'NOTIFICADO', notificado: true },
        }),
      );
    }
    for (const a of avancos) {
      ops.push(
        this.prisma.lembrete.updateMany({
          where: { id: a.id, tenantId, deletedAt: null },
          data: { dataHora: a.proxima },
        }),
      );
    }
    if (ops.length > 0) await this.prisma.$transaction(ops);
  }
}
