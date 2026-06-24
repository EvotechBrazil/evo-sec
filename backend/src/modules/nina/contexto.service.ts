import { Injectable } from '@nestjs/common';
import { ContextoRole } from '@prisma/client';
import { ContextoRepository } from './contexto.repository';

/** Mensagem do histórico de conversa (formato chat, pronto p/ o LLM). */
export interface ChatMsg {
  role: 'user' | 'assistant';
  conteudo: string;
}

/**
 * Memória conversacional durável (SPEC-006): sessão ativa por tenant (janela
 * deslizante de 30 min) + histórico em `Contexto`. Liga os models antes órfãos
 * `Sessao`/`Contexto`. Tenant-scoped via `ContextoRepository` (requireTenantId).
 *
 * IMPLEMENTAR (Sprint 8 — agente A): manter as assinaturas públicas abaixo
 * (`ChatMsg`, `historico`, `registrar`) — o adapter/voz dependem delas.
 */
@Injectable()
export class ContextoService {
  constructor(private readonly repo: ContextoRepository) {}

  /** Últimas `limite` mensagens da sessão ativa, em ordem cronológica. */
  async historico(limite = 8): Promise<ChatMsg[]> {
    const sessao = await this.repo.sessaoAtivaParaLeitura();
    if (!sessao) return [];
    const recentes = await this.repo.ultimas(sessao.id, limite);
    // `ultimas` vem desc (mais novas primeiro); inverte p/ ordem cronológica.
    return recentes
      .reverse()
      .map((c) => ({
        role: c.role === ContextoRole.USER ? 'user' : 'assistant',
        conteudo: c.conteudo,
      }));
  }

  /** Grava uma mensagem na sessão ativa (get-or-create + estende a janela). */
  async registrar(role: 'user' | 'assistant', conteudo: string): Promise<void> {
    const sessao = await this.repo.sessaoAtivaParaEscrita();
    const dbRole = role === 'user' ? ContextoRole.USER : ContextoRole.ASSISTANT;
    await this.repo.append(sessao.id, dbRole, conteudo);
  }
}
