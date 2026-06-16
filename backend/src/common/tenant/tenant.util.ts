import { InternalServerErrorException } from '@nestjs/common';
import { getTenantId } from './tenant-context';

/**
 * Obtém o tenantId do contexto ou lança erro — usado pelos repositórios para
 * garantir que nenhuma query rode sem escopo de tenant (defesa em profundidade).
 */
export function requireTenantId(): string {
  const tenantId = getTenantId();
  if (!tenantId) {
    throw new InternalServerErrorException('Tenant não resolvido no contexto.');
  }
  return tenantId;
}
