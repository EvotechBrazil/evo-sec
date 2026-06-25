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
- ✅ **Não publicado / prod intacta:** `versionId 79bc58b1…` ≠ `activeVersionId eda3d7b8…`.
- ✅ **UTF-8 íntegro** no `jsCode` salvo (`§`, regex `\s`).
- ✅ **Não-regressão:** os outros 45 nós inalterados; o nó é transparente no caminho feliz
  (`$input.all()` repassa o item do webhook com `.body`/`.headers` que o filtro já lê).

## Teste de aceite (executável pelo Tiago no cutover — fail-closed)
- **Real:** self-chat "nina ping" → responde. ✅ (Evolution manda o header)
- **Forjado:** `POST /webhook/nina` com `fromMe:true` + número do dono no corpo, **sem header**
  → descartado no `Valida Segredo` (0 itens), **nenhuma escrita**. ✅

## Pendências (Tiago — cutover, ordem importa)
1. Evolution manda `x-webhook-token: <segredo>` **primeiro** (nó ainda fail-open).
2. **Publish** do workflow.
3. Setar `EVOLUTION_WEBHOOK_HMAC_SECRET` no serviço n8n (EasyPanel) + Restart → fail-closed.
4. Validar real (passa) + forjado (descartado).

## Observação (drift de STATE detectado)
O draft de timeouts da SPEC-009 (b) (`options.timeout=15000` nos httpRequest) **não está** no
workflow vivo (só 1 ocorrência de `timeout` no JSON atual; `versionId==activeVersionId` antes
desta edição). Ou nunca foi salvo, ou foi sobrescrito por um Publish posterior. A resiliência
n8n (#3-n8n: timeout/retry/onError) segue **pendente** na UI do Tiago — independente do #1.
