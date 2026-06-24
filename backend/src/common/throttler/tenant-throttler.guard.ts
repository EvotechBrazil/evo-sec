import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { getTenantId } from '../tenant/tenant-context';

/**
 * Guard de rate-limit ciente de multi-tenant.
 *
 * A chave de contagem (tracker) é o `tenantId` quando a requisição está
 * autenticada (JWT ou service-token + x-tenant-id), caindo para o IP apenas
 * quando anônima (ex.: `POST /auth/login`).
 *
 * Por quê: o tráfego do `/nina/*` chega todo do MESMO IP do n8n
 * (service-token). Limitar por IP estrangularia o n8n inteiro num único balde.
 * Limitando por tenant, cada cliente tem seu próprio orçamento de requisições,
 * e o login anônimo (sem tenant) continua protegido por IP contra brute-force.
 */
@Injectable()
export class TenantThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    return getTenantId() ?? (req.ip as string);
  }
}
