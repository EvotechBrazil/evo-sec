import { Controller, Get, Query } from '@nestjs/common';
import {
  TenantAtivo,
  TenantResolvido,
  TenantsService,
} from './tenants.service';

/**
 * Endpoints de LOOKUP de tenant (SPEC-016 · slice 16A). Consumidos pelo n8n
 * (brain WhatsApp + crons) com service-token (`x-service-token`) e SEM
 * `x-tenant-id`.
 *
 * ⚠️ DELIBERADAMENTE NÃO tenant-scoped: descobrem/listam tenants (é o bootstrap
 * que resolve QUAL tenant atende um número). Exceção consciente à camada 1 da
 * RLS — ver nota no `TenantsRepository`. Só expõem dados não sensíveis
 * (`tenantId/numero/timezone/nome`).
 */
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  /** `GET /tenants/resolver?numero=<digits>` → tenant do número (404 se não casa). */
  @Get('resolver')
  resolver(@Query('numero') numero?: string): Promise<TenantResolvido> {
    return this.tenants.resolverPorNumero(numero ?? '');
  }

  /** `GET /tenants/ativos` → tenants ativos com número (p/ os crons iterarem). */
  @Get('ativos')
  ativos(): Promise<TenantAtivo[]> {
    return this.tenants.listarAtivos();
  }
}
