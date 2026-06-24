# HARNESS — SPRINT 8 / SPEC-006 (Memória conversacional durável)

> 2026-06-24 · Scrum master: Claude · Branch `feat/spec-006-contexto-duravel`

## Escopo entregue (backend, sem migração)
Liga os models antes órfãos `Sessao`/`Contexto` com service + repository + endpoints, e pluga a memória na voz do app:
- **`ContextoRepository`** (tenant-scoped): `sessaoAtivaParaLeitura` (ativa + `expiraEm>now`), `sessaoAtivaParaEscrita` (get-or-create + estende janela 30min), `append`, `ultimas`.
- **`ContextoService`**: `historico(limite=8)` (últimas N da sessão ativa, ordem cronológica, mapa `ContextoRole`→`'user'|'assistant'`) · `registrar(role, conteudo)`.
- **`ContextoController`**: `GET /nina/contexto?limite=N` (teto 30) · `POST /nina/contexto {role, conteudo}` — tenant-scoped.
- **`OpenRouterAdapter.intent(texto, nowIso, historico?)`**: 3º param opcional → injeta pares user/assistant no `messages` entre system e a msg atual (backward-compatible).
- **`nina.service.processar`**: no caminho NLU, carrega `historico()` antes do LLM e grava `registrar('user')`+`registrar('assistant')` depois (best-effort try/catch); caminho de confirmação (`pendente`) intacto.

## Provas
- **`tsc --noEmit`** verde · **`yarn test` 71/71** (18 novos do SPEC-006: contexto 11, adapter 3, nina.service 4).
- Cobertura: sessão get-or-create + **expiração 30min** (sessão vencida → nova, contexto antigo não vaza), `historico` ordem+limite, mapa de role bidirecional, **guarda de tenant** (sem contexto → lança), adapter com/sem histórico, `processar` multi-turno + best-effort (falha de persistência não quebra a resposta), `pendente` não toca contexto.
- **Auditoria (2 agentes):**
  - **Segurança/Multi-tenant + Standards:** APROVADO COM RESSALVAS → **1 MAIOR corrigido**: `sessaoAtivaParaEscrita` agora usa `updateMany({ where:{ id, tenantId } })` (defesa em 2 camadas, ADR-001) em vez de `update({ where:{ id } })`. Demais: tenant-scope ok, expiração ok, backward-compat ok, refactor `executarNlu` sem regressão.
  - **Harness/QA:** APROVADO, 9/9 critérios, 0 bloqueador. Menores não-issues: o `{mensagens}` vira `{data:{mensagens}}` pelo ResponseInterceptor (padrão do projeto); E2E REST era opcional.

## Pendente (Tiago)
- **Deploy da API** → a voz do app (`/nina/mensagem`, orb) ganha memória durável multi-turno; endpoints `/nina/contexto` no ar.

## Incrementos futuros
- Migrar o cérebro WhatsApp (n8n) do `staticData` p/ estes endpoints (`GET /nina/contexto` antes da Nina, `POST` depois) → memória durável + unificada entre canais.
- FK real `Contexto→Sessao` (exige migração); job de retention/poda de `contextos`.
