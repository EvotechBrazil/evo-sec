import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Contexto de tenant por requisição (AsyncLocalStorage).
 * O middleware de tenant injeta o tenantId aqui; o PrismaService o lê para
 * aplicar a RLS (SET app.current_tenant) — camada 1 da RLS de 3 camadas (ADR-001).
 */
export interface TenantStore {
  tenantId: string;
  userId?: string;
}

export const tenantStorage = new AsyncLocalStorage<TenantStore>();

export function getTenantId(): string | undefined {
  return tenantStorage.getStore()?.tenantId;
}

export function runWithTenant<T>(store: TenantStore, fn: () => T): T {
  return tenantStorage.run(store, fn);
}
