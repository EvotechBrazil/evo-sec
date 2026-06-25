# SPRINT-12 — SPEC-009 #1: webhook HMAC/segredo (release-blocker CRÍTICO)

> Fecha a parte de **código/n8n** do achado #1 (único crítico real, live-exploitable). A parte
> de cutover (env + Evolution + Publish + flip fail-closed) é handoff do Tiago — ver
> `n8n/workflows/nina-webhook-seguranca.md`.

## Escopo entregue
- Nó **`Valida Segredo (webhook)`** (Code v2) inserido como 1º passo do brain
  (`Dqm3pJo2MNHcRZ1R`), entre `Recebe Evolution` e `Filtro de Gatilho (isolamento)`.
- Semântica **fail-open → fail-closed dirigida por `EVOLUTION_WEBHOOK_HMAC_SECRET`**:
  sem segredo, passa tudo; com segredo, exige header (`x-webhook-token` / `x-evolution-token`
  / `Authorization: Bearer`); header inválido → `return []` (descarta, sem ação).

## Harness
- ✅ **Sintaxe JS** do `jsCode`: `node --check` → `SYNTAX_OK`.
- ✅ **`update_workflow`** atômico: 4 operações aplicadas, `nodeCount 45 → 46`,
  `validationWarnings: []`, `autoAssignedCredentials: []`.
- ✅ **Religação verificada** (re-fetch):
  - `Recebe Evolution → Valida Segredo (webhook) → Filtro de Gatilho (isolamento)`
  - conexão antiga `Recebe Evolution → Filtro de Gatilho` **removida**
  - `Filtro de Gatilho → Roteia (texto/midia/pronta)` **intacta**
- ✅ **Blindagem caminho crítico:** `jsCode` endurecido p/ nunca lançar (try/catch no `$env`;
  guarda em `$input.first()`) — um throw aqui = silêncio (o próprio #3). Re-`node --check` OK.
- ✅ **PUBLICADO live (fail-open):** `versionId == activeVersionId == 816107b0…`, `active:true`,
  46 nós. Sem segredo setado → passa tudo → **zero mudança de comportamento** em prod.
- ✅ **UTF-8 íntegro** no `jsCode` salvo (`§`, regex `\s`).
- ✅ **Não-regressão:** os outros 45 nós inalterados; o nó é transparente no caminho feliz
  (`$input.all()` repassa o item do webhook com `.body`/`.headers` que o filtro já lê).

## Teste de aceite (executável pelo Tiago no cutover — fail-closed)
- **Real:** self-chat "nina ping" → responde. ✅ (Evolution manda o header)
- **Forjado:** `POST /webhook/nina` com `fromMe:true` + número do dono no corpo, **sem header**
  → descartado no `Valida Segredo` (0 itens), **nenhuma escrita**. ✅

## ✅ Fechamento E2E (2026-06-25) — #1 RESOLVIDO E VERIFICADO em prod

Durante o cutover (Claude + Tiago ao vivo), dois pivôs:
1. **Header → query-param.** O **Evolution 2.3.7 não tem campo de header** no webhook (só URL).
   O nó passou a validar o segredo na **query** (`?token=<segredo>`); URL do Evolution virou
   `.../webhook/nina?token=<segredo>`. Confirmado por log (exec 821) que o `query.token` chega.
2. **`$env` não lido → 2 gotchas.** Teste forjado com token errado **VAZOU** até o LLM (exec 826,
   ~17s) mesmo com a env "setada" → `expected` vazio. Causa: (a) a env estava na **`api-nina`**, não
   no **serviço n8n** (o Code node só lê o env do processo do n8n); (b) `N8N_BLOCK_ENV_ACCESS_IN_NODE`
   bloqueia `$env` em Code node. Fix: env no **serviço n8n** + `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`
   + restart. (Tentativa de hardcodar o segredo no nó foi **barrada pelo classificador** — correto,
   "segredos só em env".)

**Verificação final (activeVersionId `8536d345`):**
- Forjado **sem token** (exec 827) → `Valida Segredo` saída `[[]]`, parou no nó (0,2s). ✅
- Forjado **token errado** (exec 828) → idem (0,26s). ✅
- **Real** (token via URL) → "nina ping" → "pong". ✅

**Lição:** "pong" sozinho NÃO prova enforcement (fail-open responde igual); o teste forjado é que
distingue. Detalhe completo + config + rotação em `n8n/workflows/nina-webhook-seguranca.md`.

## Observação (drift de STATE detectado)
O draft de timeouts da SPEC-009 (b) (`options.timeout=15000` nos httpRequest) **não está** no
workflow vivo (só 1 ocorrência de `timeout` no JSON atual; `versionId==activeVersionId` antes
desta edição). Ou nunca foi salvo, ou foi sobrescrito por um Publish posterior. A resiliência
n8n (#3-n8n: timeout/retry/onError) segue **pendente** na UI do Tiago — independente do #1.
