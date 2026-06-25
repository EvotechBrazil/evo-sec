import { Injectable } from '@nestjs/common';
import { ContatoVip } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../common/tenant/tenant.util';

export interface TenantDigestInfo {
  timezone: string;
  whatsappNumber: string | null;
  quietHoursInicio: string | null;
  quietHoursFim: string | null;
}

/**
 * Leituras tenant-scoped específicas do digest que não têm service próprio
 * (VIPs, Config de opt-out, dados do Tenant). Toda query filtra tenantId
 * (defesa em profundidade além da RLS — ADR-001).
 */
@Injectable()
export class ResumoRepository {
  constructor(private readonly prisma: PrismaService) {}

  listVips(): Promise<ContatoVip[]> {
    return this.prisma.contatoVip.findMany({
      where: { tenantId: requireTenantId(), deletedAt: null },
      orderBy: { nome: 'asc' },
    });
  }

  async tenantInfo(): Promise<TenantDigestInfo> {
    const t = await this.prisma.tenant.findFirst({
      where: { id: requireTenantId(), deletedAt: null },
      select: {
        timezone: true,
        whatsappNumber: true,
        quietHoursInicio: true,
        quietHoursFim: true,
      },
    });
    return {
      timezone: t?.timezone ?? 'America/Sao_Paulo',
      whatsappNumber: t?.whatsappNumber ?? null,
      quietHoursInicio: t?.quietHoursInicio ?? null,
      quietHoursFim: t?.quietHoursFim ?? null,
    };
  }

  /** Flag de opt-out por chave em Config. Ausente = ativo (default true). */
  async flagAtiva(chave: string): Promise<boolean> {
    const cfg = await this.prisma.config.findUnique({
      where: { tenantId_chave: { tenantId: requireTenantId(), chave } },
      select: { valor: true },
    });
    if (!cfg) return true;
    return cfg.valor.trim().toLowerCase() !== 'false';
  }
}
