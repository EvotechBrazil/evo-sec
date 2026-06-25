import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { loadEnv } from '../../config/env.config';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Autenticação do dashboard. A query de login roda fora de contexto de tenant
 * (entrada do sistema), por isso usa o PrismaService direto.
 */
@Injectable()
export class AuthService {
  private readonly env = loadEnv();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<AuthTokens> {
    // SPEC-015 #11: com email globalmente único (schema), findFirst({ email })
    // resolve no máximo 1 conta → login determinístico (não depende do tenant).
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }
    return this.issueTokens(user.id, user.tenantId);
  }

  async changePassword(
    userId: string,
    senhaAtual: string,
    novaSenha: string,
  ): Promise<{ ok: true }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user || !(await bcrypt.compare(senhaAtual, user.passwordHash))) {
      throw new UnauthorizedException('Senha atual incorreta.');
    }
    const passwordHash = await bcrypt.hash(novaSenha, 10);
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    return { ok: true };
  }

  /**
   * SPEC-015 §6 (#18): renova o access silenciosamente a partir de um refresh
   * válido, reemitindo um par novo (rotação simples). Em qualquer falha de verify
   * (assinatura/expiração) → 401. Sem denylist/jti aqui — revogação de refresh
   * (logout server-side, reuse-detection) fica como follow-up.
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    let sub: string;
    let tenantId: string;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; tenantId: string }>(
        refreshToken,
        { secret: this.env.jwtRefreshSecret },
      );
      sub = payload.sub;
      tenantId = payload.tenantId;
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }
    return this.issueTokens(sub, tenantId);
  }

  private async issueTokens(sub: string, tenantId: string): Promise<AuthTokens> {
    const payload = { sub, tenantId };
    const accessExpires = this.env.jwtAccessTtl as JwtSignOptions['expiresIn'];
    const refreshExpires = this.env.jwtRefreshTtl as JwtSignOptions['expiresIn'];
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.env.jwtSecret,
        expiresIn: accessExpires,
      }),
      this.jwt.signAsync(payload, {
        secret: this.env.jwtRefreshSecret,
        expiresIn: refreshExpires,
      }),
    ]);
    return { accessToken, refreshToken };
  }
}
