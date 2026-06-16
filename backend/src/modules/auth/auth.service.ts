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
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }
    return this.issueTokens(user.id, user.tenantId);
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
