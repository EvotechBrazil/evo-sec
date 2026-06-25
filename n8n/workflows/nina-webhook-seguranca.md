# Nina — Segurança do webhook (SPEC-009 #1, release-blocker CRÍTICO)

> Fecha o achado **#1** do `PREMORTEM-sistema-2026-06-24.md`: o webhook `/webhook/nina` é
> público e o `Filtro de Gatilho` confia em `fromMe`/`remoteJid` que **vêm no corpo do POST**
> (forjáveis). Sem isso, qualquer um forja `fromMe:true` + o número do dono e dispara escrita
> destrutiva (criar conta/movimentação/compromisso direto; pagar/cancelar/aportar em 2 msgs).

## O que foi feito (Claude, via MCP) — workflow `Dqm3pJo2MNHcRZ1R`
Inserido o nó **`Valida Segredo (webhook)`** (Code v2) como **1º passo**, antes do filtro:

```
Recebe Evolution (webhook) → Valida Segredo (webhook) → Filtro de Gatilho (isolamento) → …
```

Lógica (**fail-open → fail-closed dirigido por env**):
- Lê `EVOLUTION_WEBHOOK_HMAC_SECRET` do ambiente do n8n (`$env`, com `try/catch`).
- **Sem o segredo setado** → `return $input.all()` (passa tudo). Comportamento atual preservado,
  **não derruba a produção**.
- **Com o segredo setado** → exige um header igual ao segredo. Aceita
  `x-webhook-token`, `x-evolution-token` ou `Authorization: Bearer <segredo>`
  (nome do header case-insensitive).
- **Header ausente/errado** → `return []` (mesma semântica do `Filtro de Gatilho`): nada flui
  adiante; o webhook já respondeu `200` vazio (`noResponseBody`), então a requisição forjada
  **não dispara nenhuma ação**.

> ⚠️ **Estado:** o nó está no **draft** (`versionId` diverge do `activeVersionId`). A versão
> **ativa em produção segue a antiga** até o **Publish**. Como o nó é fail-open, publicá-lo
> sozinho **não muda nada** no comportamento — só passa a valer quando o segredo existir.

## Cutover (Tiago) — **a ORDEM importa; inverter derruba o WhatsApp**
O perigo é setar o segredo no n8n **antes** do Evolution mandar o header → o nó vira fail-closed
e **descarta todas as mensagens reais** (silêncio total). Faça nesta ordem:

1. **Gerar o segredo:** `openssl rand -hex 32`. Guarde-o.
2. **Evolution PRIMEIRO** — configurar o webhook da instância `nina` para enviar o header
   `x-webhook-token: <segredo>` (campo *Headers* na config de webhook do Evolution; se a sua
   versão não tiver, use a alternativa do path — ver abaixo). Nesse momento o nó ainda está
   fail-open: o header chega mas é ignorado → **nada quebra**.
3. **Publish do workflow** (draft → ativo). Continua fail-open (segredo ainda não setado no n8n).
4. **Validar** que mensagens reais continuam chegando (manda um self-chat "nina ping").
5. **Setar `EVOLUTION_WEBHOOK_HMAC_SECRET=<segredo>`** no ambiente do **serviço n8n** (EasyPanel)
   + **Restart** do n8n (lê env no boot). Agora o nó está **fail-closed**.
6. **Validar fail-closed (teste de aceite):**
   - **Real:** self-chat "nina ping" → responde (Evolution mandou o header). ✅
   - **Forjado:** `curl -X POST https://alicia-n8n.rte6ms.easypanel.host/webhook/nina -H 'content-type: application/json' -d '{"data":{"key":{"fromMe":true,"remoteJid":"5543999864409@s.whatsapp.net"},"message":{"conversation":"nina cria conta teste 999"}}}'`
     → **execução descartada no `Valida Segredo` (0 itens), nenhuma conta criada**. ✅

### Alternativa / reforço opcional — path não-advinhável
Se o Evolution da instância **não** suportar headers customizados no webhook, troque o secret de
header por **path**: renomear `Recebe Evolution` de `path: nina` → `path: nina-<token-aleatório>`
e apontar o Evolution para a URL nova. A própria URL vira o segredo (a config do nó fail-open
fica inerte, mas pode coexistir). **Cutover sincronizado** (a URL antiga para de funcionar no
Publish), então: criar a URL nova no Evolution → Publish → validar → desativar a antiga.
Defesa em profundidade = **header _e_ path**.

## Referências
- SPEC: `.ai/SPECS/SPEC-009-onda1b-hardening.md` (§5)
- Premortem (#1): `.ai/PREMORTEMS/PREMORTEM-sistema-2026-06-24.md`
- Env exemplo: `infra/.env.example` (`EVOLUTION_WEBHOOK_HMAC_SECRET`)
- Harness: `.ai/HARNESS_RESULTS/SPRINT-12-spec-009-webhook-hmac.md`
