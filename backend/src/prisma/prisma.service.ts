import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getTenantId } from '../common/tenant/tenant-context';

/**
 * PrismaService com escopo de tenant.
 *
 * RLS de 3 camadas (ADR-001):
 *  1) Esta extensão injeta `SET LOCAL app.current_tenant` em cada query, dentro
 *     de uma transação, com base no tenant-context da requisição;
 *  2) Policies de RLS no PostgreSQL filtram por current_setting('app.current_tenant');
 *  3) Testes de isolamento cross-tenant (harness).
 *
 * `tenantClient()` devolve um client cujas operações rodam já com o tenant setado.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Executa um conjunto de operações com o tenant atual aplicado via RLS.
   * Usa transação para garantir que `SET LOCAL` valha apenas para o escopo.
   */
  async withTenant<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new Error('Tenant não resolvido no contexto da requisição.');
    }
    return this.$transaction(async (tx) => {
      // set_config(parameter, value, is_local=true) — escopo de transação
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_tenant', $1, true)`,
        tenantId,
      );
      return fn(tx as unknown as PrismaClient);
    });
  }
}
