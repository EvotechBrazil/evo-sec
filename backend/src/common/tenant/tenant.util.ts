import { InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { getTenantId, getUserId } from './tenant-context';

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

/**
 * Obtém o userId do contexto (presente apenas em auth via JWT do dashboard).
 * Lança 401 quando ausente — usado em rotas que exigem usuário logado
 * (ex.: troca de senha), barrando acesso por token de serviço.
 */
export function requireUserId(): string {
  const userId = getUserId();
  if (!userId) {
    throw new UnauthorizedException('Ação exige usuário autenticado (JWT).');
  }
  return userId;
}
