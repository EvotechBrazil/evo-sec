import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService, AuthTokens } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

// Factory (não automock): automock carregaria o bcrypt real e seu binário nativo
// não compila no ambiente de teste local (em prod o Docker compila).
jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));

/**
 * Auth do dashboard. Foco do SPEC-015:
 *  - login determinístico (email globalmente único → acha o user certo);
 *  - /auth/refresh: refresh válido reemite par (rotação); inválido → 401.
 * O escopo de tenant do login roda fora de contexto (PrismaService direto),
 * por isso o Prisma é mockado aqui.
 */
describe('AuthService', () => {
  const bcryptCompare = bcrypt.compare as unknown as jest.Mock;

  // env exigido por loadEnv() (field initializer do service).
  beforeAll(() => {
    process.env.DATABASE_URL ??= 'postgres://test';
    process.env.JWT_SECRET ??= 'test-access-secret';
    process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
    process.env.ENCRYPTION_KEY ??= '0123456789abcdef0123456789abcdef'; // 32 chars
    process.env.SERVICE_TOKEN ??= 'test-service-token';
  });

  function build() {
    const prisma = {
      user: { findFirst: jest.fn(), update: jest.fn() },
    };
    const jwt = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };
    const service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
    );
    return { service, prisma, jwt };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('é determinístico: acha o user por email e emite tokens com o tenant dele', async () => {
      const { service, prisma, jwt } = build();
      prisma.user.findFirst.mockResolvedValue({
        id: 'u-1',
        tenantId: 't-1',
        passwordHash: 'hash',
        deletedAt: null,
      });
      bcryptCompare.mockResolvedValue(true);
      jwt.signAsync.mockResolvedValueOnce('access').mockResolvedValueOnce('refresh');

      const out: AuthTokens = await service.login('dono@tenant.com', 'senha123');

      // busca só por email (+ não-excluído) — determinismo vem do unique global.
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'dono@tenant.com', deletedAt: null },
      });
      // os dois tokens carregam o tenant do user encontrado.
      const payloads = jwt.signAsync.mock.calls.map((c) => c[0]);
      expect(payloads).toEqual([
        { sub: 'u-1', tenantId: 't-1' },
        { sub: 'u-1', tenantId: 't-1' },
      ]);
      expect(out).toEqual({ accessToken: 'access', refreshToken: 'refresh' });
    });

    it('rejeita (401) quando não existe user com aquele email', async () => {
      const { service, prisma } = build();
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.login('nao@existe.com', 'x')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(bcryptCompare).not.toHaveBeenCalled();
    });

    it('rejeita (401) quando a senha não confere', async () => {
      const { service, prisma } = build();
      prisma.user.findFirst.mockResolvedValue({
        id: 'u-1',
        tenantId: 't-1',
        passwordHash: 'hash',
        deletedAt: null,
      });
      bcryptCompare.mockResolvedValue(false);
      await expect(service.login('dono@tenant.com', 'errada')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('refresh válido → verifica com o secret de refresh e reemite par novo (rotação)', async () => {
      const { service, jwt } = build();
      jwt.verifyAsync.mockResolvedValue({ sub: 'u-1', tenantId: 't-1' });
      jwt.signAsync.mockResolvedValueOnce('novo-access').mockResolvedValueOnce('novo-refresh');

      const out = await service.refresh('refresh-antigo');

      expect(jwt.verifyAsync).toHaveBeenCalledWith('refresh-antigo', {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      const payloads = jwt.signAsync.mock.calls.map((c) => c[0]);
      expect(payloads).toEqual([
        { sub: 'u-1', tenantId: 't-1' },
        { sub: 'u-1', tenantId: 't-1' },
      ]);
      expect(out).toEqual({ accessToken: 'novo-access', refreshToken: 'novo-refresh' });
    });

    it('refresh inválido/expirado → 401 e não emite tokens', async () => {
      const { service, jwt } = build();
      jwt.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.refresh('lixo')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(jwt.signAsync).not.toHaveBeenCalled();
    });
  });
});
