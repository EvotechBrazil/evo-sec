import { Injectable } from '@nestjs/common';
import { Contexto, ContextoRole, Sessao } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../common/tenant/tenant.util';

/** Janela deslizante da sessão conversacional, em minutos (SPEC-006). */
export const JANELA_MIN = 30;

/**
 * Persistência tenant-scoped de `Sessao`/`Contexto` (SPEC-006). Toda query
 * filtra `tenantId` (requireTenantId) — defesa em profundidade além da RLS.
 *
 * Get-or-create da sessão ativa (janela deslizante 30 min), append de Contexto
 * e leitura das últimas N. Sem migração (tabelas `sessoes`/`contextos` já
 * existem; `Contexto.sessaoId` é string solta).
 */
@Injectable()
export class ContextoRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Sessão ativa ainda dentro da janela (só leitura — não estende). */
  sessaoAtivaParaLeitura(): Promise<Sessao | null> {
    return this.prisma.sessao.findFirst({
      where: { tenantId: requireTenantId(), ativa: true, expiraEm: { gt: new Date() } },
      orderBy: { expiraEm: 'desc' },
    });
  }

  /**
   * Sessão ativa para escrita: estende a janela da existente (+30 min) ou cria
   * uma nova. Sempre devolve uma `Sessao` válida.
   */
  async sessaoAtivaParaEscrita(): Promise<Sessao> {
    const tenantId = requireTenantId();
    const agora = new Date();
    const expiraEm = new Date(agora.getTime() + JANELA_MIN * 60_000);
    const ativa = await this.sessaoAtivaParaLeitura();
    if (ativa) {
      // updateMany p/ filtrar tenantId no WHERE também (defesa em 2 camadas, ADR-001 —
      // `update` por id unique não aceita tenantId no where).
      await this.prisma.sessao.updateMany({ where: { id: ativa.id, tenantId }, data: { expiraEm } });
      return { ...ativa, expiraEm };
    }
    return this.prisma.sessao.create({
      data: { tenantId, ativa: true, abertaEm: agora, expiraEm },
    });
  }

  /** Acrescenta uma mensagem à sessão. */
  async append(sessaoId: string, role: ContextoRole, conteudo: string): Promise<void> {
    await this.prisma.contexto.create({
      data: { tenantId: requireTenantId(), sessaoId, role, conteudo },
    });
  }

  /** Últimas `limite` mensagens da sessão (mais recentes primeiro). */
  ultimas(sessaoId: string, limite: number): Promise<Contexto[]> {
    return this.prisma.contexto.findMany({
      where: { tenantId: requireTenantId(), sessaoId },
      orderBy: { createdAt: 'desc' },
      take: limite,
    });
  }
}
