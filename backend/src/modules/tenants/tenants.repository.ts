import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Projeção mínima e NÃO sensível de um tenant (só o necessário p/ o bootstrap). */
export interface TenantLookup {
  id: string;
  nome: string;
  timezone: string;
  whatsappNumber: string | null;
}

/**
 * Repositório de LOOKUP de tenants (SPEC-016 · slice 16A).
 *
 * ⚠️ EXCEÇÃO CONSCIENTE à camada 1 da RLS (ADR-001): estes endpoints DESCOBREM
 * o tenant a partir do número do WhatsApp, então NÃO podem ser tenant-scoped
 * (não usam `requireTenantId()`). São o lookup de bootstrap chamado pelo n8n com
 * service-token e SEM `x-tenant-id`. Por isso usamos o PrismaService direto
 * (sem `withTenant`/`SET LOCAL`), filtrando apenas `deletedAt: null`, e o
 * `select` expõe somente campos não sensíveis (`id/nome/timezone/whatsappNumber`).
 */
@Injectable()
export class TenantsRepository {
  private static readonly SELECT = {
    id: true,
    nome: true,
    timezone: true,
    whatsappNumber: true,
  } as const;

  constructor(private readonly prisma: PrismaService) {}

  /** Todos os tenants ativos (não deletados), p/ a resolução pelo número. */
  listarAtivos(): Promise<TenantLookup[]> {
    return this.prisma.tenant.findMany({
      where: { deletedAt: null },
      select: TenantsRepository.SELECT,
      orderBy: { nome: 'asc' },
    });
  }

  /** Tenants ativos COM número de WhatsApp definido (p/ os crons iterarem). */
  listarAtivosComNumero(): Promise<TenantLookup[]> {
    return this.prisma.tenant.findMany({
      where: { deletedAt: null, whatsappNumber: { not: null } },
      select: TenantsRepository.SELECT,
      orderBy: { nome: 'asc' },
    });
  }
}
