import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantsRepository } from './tenants.repository';

/** Resolução de tenant: dados não sensíveis devolvidos ao brain do n8n. */
export interface TenantResolvido {
  tenantId: string;
  timezone: string;
  nome: string;
}

/** Tenant ativo listado p/ os crons iterarem (1 chamada por tenant). */
export interface TenantAtivo {
  tenantId: string;
  numero: string;
  timezone: string;
  nome: string;
}

/** Mantém só os dígitos da string (descarta `+`, espaços, `@s.whatsapp.net`, etc.). */
function soDigitos(valor: string | null | undefined): string {
  return String(valor ?? '').replace(/\D/g, '');
}

/**
 * Compara dois números de WhatsApp tolerando o 9º dígito brasileiro — espelha
 * o `mesmoNumero` do filtro de gatilho do n8n (nina-main.workflow.ts):
 * `554399864409` casa com `5543999864409`. Match por igualdade exata OU pelos
 * últimos 8 dígitos + mesmo DDD (descontando o prefixo `55` do país).
 */
function mesmoNumero(a: string, b: string): boolean {
  const da = soDigitos(a);
  const db = soDigitos(b);
  if (!da || !db) return false;
  if (da === db) return true;
  const ddd = (x: string): string => x.replace(/^55/, '').slice(0, 2);
  return da.slice(-8) === db.slice(-8) && ddd(da) === ddd(db);
}

/**
 * Serviço de LOOKUP de tenants (SPEC-016 · slice 16A). NÃO é tenant-scoped:
 * descobre/lista tenants p/ o n8n parar de hardcodar `x-tenant-id`/`TENANT_ID`.
 * Ver nota de exceção consciente à RLS no `TenantsRepository`.
 */
@Injectable()
export class TenantsService {
  constructor(private readonly repo: TenantsRepository) {}

  /**
   * Resolve o tenant pelo número do WhatsApp (tolerância ao 9º dígito BR).
   * Não encontrar → 404 (o brain do n8n trata como "número desconhecido").
   */
  async resolverPorNumero(numero: string): Promise<TenantResolvido> {
    const alvo = soDigitos(numero);
    if (!alvo) {
      throw new NotFoundException('Número não informado ou sem dígitos.');
    }
    const tenants = await this.repo.listarAtivosComNumero();
    const encontrado = tenants.find((t) => mesmoNumero(t.whatsappNumber ?? '', alvo));
    if (!encontrado) {
      throw new NotFoundException(`Nenhum tenant ativo para o número ${alvo}.`);
    }
    return {
      tenantId: encontrado.id,
      timezone: encontrado.timezone,
      nome: encontrado.nome,
    };
  }

  /**
   * Lista os tenants ativos com número de WhatsApp (p/ os crons iterarem).
   * Expõe somente dados não sensíveis (`tenantId/numero/timezone/nome`).
   */
  async listarAtivos(): Promise<TenantAtivo[]> {
    const tenants = await this.repo.listarAtivosComNumero();
    return tenants.map((t) => ({
      tenantId: t.id,
      numero: t.whatsappNumber ?? '',
      timezone: t.timezone,
      nome: t.nome,
    }));
  }
}
