# Nina — Segurança do webhook (SPEC-009 #1, release-blocker CRÍTICO) — ✅ FECHADO

> Fecha o achado **#1** do `PREMORTEM-sistema-2026-06-24.md`: o webhook `/webhook/nina` era
> público e o `Filtro de Gatilho` confiava em `fromMe`/`remoteJid` que **vêm no corpo do POST**
> (forjáveis). Sem isso, qualquer um forjava `fromMe:true` + o número do dono e disparava escrita
> destrutiva. **Resolvido e verificado E2E em produção (2026-06-25).**

## Solução — workflow `Dqm3pJo2MNHcRZ1R` (activeVersionId `8536d345`)
Nó **`Valida Segredo (webhook)`** (Code v2) como **1º passo**, antes do filtro:

```
Recebe Evolution (webhook) → Valida Segredo (webhook) → Filtro de Gatilho → …
```

O segredo viaja na **query da URL** (`?token=<segredo>`) — o **Evolution 2.3.7 não tem campo de
header** customizado no webhook, só o campo URL. O nó também aceita header
(`x-webhook-token` / `x-evolution-token` / `Authorization: Bearer`) para Evolution futuro.

Lógica (**fail-open → fail-closed dirigido por env**):
- Lê `EVOLUTION_WEBHOOK_HMAC_SECRET` via `$env` (com `try/catch`).
- **Sem o segredo legível** → `return $input.all()` (passa tudo; não derruba prod).
- **Com o segredo** → exige `?token=<segredo>` igual; ausente/errado → `return []` (descarta sem
  ação; o webhook já respondeu `200` vazio via `noResponseBody`).
- Caminho crítico: `try/catch` + guardas em `$input.first()` → **nunca lança** (throw = silêncio).

## ⚠️ Gotchas que custaram tempo (lições p/ a próxima vez)
1. **A env vai no serviço do n8n, NÃO na `api-nina`.** Quem lê o segredo é o Code node **dentro do
   n8n**; ele só enxerga o ambiente do **processo do n8n**. Posto na `api-nina`, o n8n nunca vê →
   `$env` volta vazio → fail-open → forjado vazava. (O backend **não usa** essa var — premortem #1.)
2. **`N8N_BLOCK_ENV_ACCESS_IN_NODE=false`** é obrigatório p/ o Code node ler `$env`. Sem isso, `$env`
   vem vazio mesmo com a var setada → fica fail-open silenciosamente.
3. **"pong" não prova enforcement.** Um gate fail-open responde "pong" igualzinho. Só o **teste
   forjado** (token errado tem que cair) distingue fail-open de fail-closed.

## Config final (no serviço **n8n** do EasyPanel)
```
EVOLUTION_WEBHOOK_HMAC_SECRET=<segredo>     # MESMO valor do ?token= da URL
N8N_BLOCK_ENV_ACCESS_IN_NODE=false          # libera $env no Code node
```
+ URL do webhook no Evolution = `https://alicia-n8n.rte6ms.easypanel.host/webhook/nina?token=<segredo>`
(manter **"Webhook by Events" DESMARCADO** — senão estraga a URL). **Restart do serviço n8n** (lê env no boot).

## Verificação E2E (2026-06-25) — ✅
- **Forjado sem token** (exec 827) → `Valida Segredo` saída `[[]]`, parou no nó; Filtro/Nina **não**
  rodaram (0,2s). ✅ bloqueado.
- **Forjado token errado** (exec 828) → idem (0,26s). ✅ bloqueado.
  *(Antes do fix, a mesma forjada vazava até o LLM em ~17s — exec 826.)*
- **Mensagem real** (token via URL) → "nina ping" → **"pong"**. ✅ passa.

## Rotação do segredo
Trocar em **dois lugares** (têm que ser iguais): a env `EVOLUTION_WEBHOOK_HMAC_SECRET` no n8n **e**
o `?token=` da URL no Evolution. Gerar com `openssl rand -hex 32`.

## Reforço futuro (opcional)
- **Path não-advinhável** (renomear `/webhook/nina` → `/webhook/<token>`) como 2ª camada.
- Quando o Evolution suportar header no webhook, migrar o token p/ header (menos exposto em logs que
  a query) — o nó já aceita header.

## Referências
- SPEC: `.ai/SPECS/SPEC-009-onda1b-hardening.md` (§5) · Premortem #1
- Harness: `.ai/HARNESS_RESULTS/SPRINT-12-spec-009-webhook-hmac.md`
