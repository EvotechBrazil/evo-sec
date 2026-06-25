import { UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { AuthMiddleware } from './auth.middleware';
import { PrismaService } from '../../prisma/prisma.service';
import { getTenantId } from '../tenant/tenant-context';

/**
 * SPEC-015 (#12): no caminho do service-token, o `x-tenant-id` é validado
 * contra o banco antes de abrir o contexto. Foco do slice 15B; o caminho JWT
 * não é tocado e fica fora destes testes. PrismaService é mockado.
 */
describe('AuthMiddleware (service-token)', () => {
  const SERVICE_TOKEN = 'svc-secreto';

  function build() {
    // loadEnv() lê de process.env no boot do middleware.
    process.env.SERVICE_TOKEN = SERVICE_TOKEN;
    process.env.JWT_SECRET = 'jwt-secreto';

    const findFirst = jest.fn();
    const prisma = { tenant: { findFirst } } as unknown as PrismaService;
    const jwt = {} as unknown as JwtService;
    const middleware = new AuthMiddleware(jwt, prisma);
    return { middleware, findFirst };
  }

  function reqCom(headers: Record<string, string | undefined>): Request {
    return {
      header: (name: string): string | undefined => headers[name.toLowerCase()],
    } as unknown as Request;
  }

  const res = {} as Response;

  it('com x-tenant-id válido (existe e ativo): abre o contexto', async () => {
    const { middleware, findFirst } = build();
    findFirst.mockResolvedValue({ id: 'tenant-1' });

    let tenantNoContexto: string | undefined;
    const next = jest.fn(() => {
      tenantNoContexto = getTenantId();
    });

    await middleware.use(
      reqCom({ 'x-service-token': SERVICE_TOKEN, 'x-tenant-id': 'tenant-1' }),
      res,
      next,
    );

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'tenant-1', deletedAt: null },
      select: { id: true },
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(tenantNoContexto).toBe('tenant-1');
  });

  it('com x-tenant-id inexistente/soft-deletado: 401 e não chama next', async () => {
    const { middleware, findFirst } = build();
    findFirst.mockResolvedValue(null);
    const next = jest.fn();

    await expect(
      middleware.use(
        reqCom({ 'x-service-token': SERVICE_TOKEN, 'x-tenant-id': 'tenant-fantasma' }),
        res,
        next,
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(next).not.toHaveBeenCalled();
  });

  it('sem x-tenant-id: passa sem contexto (não 401) e não consulta o banco', async () => {
    const { middleware, findFirst } = build();

    let tenantNoContexto: string | undefined = 'sentinela';
    const next = jest.fn(() => {
      tenantNoContexto = getTenantId();
    });

    await middleware.use(reqCom({ 'x-service-token': SERVICE_TOKEN }), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(tenantNoContexto).toBeUndefined();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('com x-service-token inválido: 401 (token de serviço inválido)', async () => {
    const { middleware } = build();
    const next = jest.fn();

    await expect(
      middleware.use(
        reqCom({ 'x-service-token': 'errado', 'x-tenant-id': 'tenant-1' }),
        res,
        next,
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(next).not.toHaveBeenCalled();
  });
});
