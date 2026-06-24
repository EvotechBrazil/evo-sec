# PREMORTEM — SPEC-006 (Contexto durável)

> Classe P1 (multi-tenant + memória de conversa). Mudança aditiva no backend (sem migração; models já existem).

| # | Risco | P×I | Mitigação |
|---|---|---|---|
| 1 | **Vazamento entre tenants** (contexto de um aparece p/ outro) | **20** | Toda query (`sessao`/`contexto`) via `requireTenantId()`; testes de isolamento no repo; sessão ativa resolvida por tenant. |
| 2 | **Contexto velho "vaza" entre conversas** (sessão não expira → mistura assuntos antigos) | 12 | Janela deslizante 30 min; sessão `expiraEm < agora` → cria nova; `historico` só lê a sessão ativa; teste de expiração. |
| 3 | **Quebrar a voz do app** (`processar`) ao injetar histórico/persistência | 12 | `intent(historico?)` backward-compatible; `registrar` não bloqueia a resposta (best-effort, try/catch); preserva o fluxo `pendente` (confirmação) intacto; testes. |
| 4 | **Custo/tokens** com histórico grande | 9 | `limite` default 8, teto 30; histórico só de texto; `max_tokens` inalterado. |
| 5 | **Crescimento de `contextos`** (tabela cresce sem fim) | 8 | Aceitável p/ MVP (1 dono); retention/poda = follow-up. `historico` usa índice `[tenantId, sessaoId, createdAt]`. |
| 6 | **Concorrência** (2 requests criam 2 sessões) | 6 | get-or-create pega a mais recente ativa; duplicação de sessão é inócua (histórico segue a última); risco baixo (single-user). |
| 7 | **Tabela não existe em prod** (migração não aplicada) | 8 | Confirmar `prisma.sessao`/`prisma.contexto` no client + `migrate status`; se faltar, é deploy normal (entrypoint roda `migrate deploy`). |

## Gate de saída
`tsc` verde · `yarn test` verde (unit: sessão/expiração/historico/tenant) · 2 auditores (segurança/tenant + harness/QA) aprovam · STATE atualizado · deploy pelo Tiago → validação E2E.
