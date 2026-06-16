import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';
import { runWithTenant } from '../tenant/tenant-context';
import { loadEnv } from '../../config/env.config';

/**
 * Resolve o tenant da requisição e executa o restante do pipeline dentro do
 * contexto de tenant (AsyncLocalStorage). Dois modos de autenticação:
 *  - n8n / serviço: header `x-service-token` (== SERVICE_TOKEN) + `x-tenant-id`.
 *  - Dashboard: `Authorization: Bearer <jwt>` (JWT carrega tenantId + sub).
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly env = loadEnv();

  constructor(private readonly jwt: JwtService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const serviceToken = req.header('x-service-token');
    if (serviceToken) {
      if (serviceToken !== this.env.serviceToken) {
        throw new UnauthorizedException('Token de serviço inválido.');
      }
      const tenantId = req.header('x-tenant-id');
      if (!tenantId) {
        throw new UnauthorizedException('x-tenant-id ausente para token de serviço.');
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
