import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';
import { runWithTenant } from '../tenant/tenant-context';
import { loadEnv } from '../../config/env.config';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Resolve o tenant da requisição e executa o restante do pipeline dentro do
 * contexto de tenant (AsyncLocalStorage). Dois modos de autenticação:
 *  - n8n / serviço: header `x-service-token` (== SERVICE_TOKEN) + `x-tenant-id`.
 *  - Dashboard: `Authorization: Bearer <jwt>` (JWT carrega tenantId + sub).
 *
 * SPEC-015 (#12): no caminho do service-token, o `x-tenant-id` deixou de ser
 * confiado cegamente. Quando presente, o tenant é validado contra o banco
 * (existe e não foi soft-deletado) antes de abrir o contexto — fecha o
 * "token mestre aceita qualquer tenant". Quando ausente, a requisição segue
 * SEM contexto (e SEM 401), habilitando endpoints de bootstrap que DESCOBREM
 * o tenant (ex.: `GET /tenants/resolver`); rotas tenant-scoped falham
 * naturalmente em `requireTenantId()`.
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly env = loadEnv();

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const serviceToken = req.header('x-service-token');
    if (serviceToken) {
      if (serviceToken !== this.env.serviceToken) {
        throw new UnauthorizedException('Token de serviço inválido.');
      }
      const tenantId = req.header('x-tenant-id');
      // Sem x-tenant-id: segue sem contexto (bootstrap/lookup de tenant).
      // As rotas tenant-scoped barram depois em requireTenantId().
      if (!tenantId) {
        next();
        return;
      }
      // Com x-tenant-id: o token de serviço não é mais master-key — o tenant
      // precisa existir e estar ativo (não soft-deletado).
      const tenant = await this.prisma.tenant.findFirst({
        where: { id: tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!tenant) {
        throw new UnauthorizedException('Tenant inválido ou inativo.');
      }
      runWithTenant({ tenantId }, () => next());
      return;
    }

    const auth = req.header('authorization');
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Credenciais ausentes.');
    }
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; tenantId: string }>(
        auth.slice('Bearer '.length),
        { secret: this.env.jwtSecret },
      );
      runWithTenant({ tenantId: payload.tenantId, userId: payload.sub }, () => next());
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }
  }
}
