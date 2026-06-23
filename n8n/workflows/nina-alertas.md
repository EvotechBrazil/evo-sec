# Nina — Alertas Proativos (SPEC-004)

> 3 alertas agendados (Schedule) que buscam um read-model proativo na API e enviam no WhatsApp privado do tenant **só quando há o que avisar** (`temAlerta`). Espelha o digest (`nina-digest.md`): leitura + envio, sem cérebro/LLM, sem gatilho. A única diferença estrutural para o digest é a condição extra `temAlerta` no IF.

## Fluxo

```
[Cron Vencimentos 8h diário]   ─→ [Set rota=vencimentos]  ─┐
[Cron Aportes Seg 9h]          ─→ [Set rota=aportes]       ─┼→ [HTTP GET /resumo/{rota}] → [IF ativo && temAlerta && numero] → [Evolution sendText]
[Cron Follow-ups Seg-Sex 8h30] ─→ [Set rota=follow-ups]    ─┘                                            └→ (false) → fim (opt-out / sem alerta / sem número)
```

Três Schedule Triggers independentes; cada um define `rota` num nó Set e converge no mesmo trio HTTP→IF→Evolution.

## Nós

### [1a/1b/1c] Schedule Triggers
- Tipo `n8n-nodes-base.scheduleTrigger` (v1.3). Cron de **6 campos** (`[seg] [min] [hora] [dia-mês] [mês] [dia-sem]`) — a SPEC §3 cita o mesmo horário em 5 campos; o n8n usa 6. Tz da instância (`America/Sao_Paulo`):
  - **Vencimentos:** `0 0 8 * * *` (todo dia 08:00 — contas vencem fim de semana também).
  - **Aportes:** `0 0 9 * * 1` (segunda 09:00).
  - **Follow-ups:** `0 30 8 * * 1-5` (seg–sex 08:30).

### [2a/2b/2c] Set — define a rota
- Tipo `n8n-nodes-base.set` (v3.4), `mode: manual`, `includeOtherFields: false`.
- Cada um seta `rota` = `vencimentos` | `aportes` | `follow-ups`.

### [3] HTTP Request — buscar alerta
- `GET https://nina-api.rte6ms.easypanel.host/api/v1/resumo/{{ $json.rota }}`.
- Auth: Header Auth → credencial **"Nina API service token"** (id `106lKMqNprmKFB1k`, envia `x-service-token`).
- Header literal: `x-tenant-id: 00000000-0000-0000-0000-000000000001` (1º tenant).
- Resposta envelopada (`{ data: {...} }` — ResponseInterceptor). Acessar via `$json.data.*`:
  ```json
  { "data": { "ativo": true, "numero": "5543...", "temAlerta": true,
              "dia": "24/06", "resumo": { }, "texto": "..." } }
  ```

### [4] IF — só envia se ativo, com alerta e com número
- Condição (AND), `typeValidation: loose` + `looseTypeValidation: true` (gotcha do IF herdado da SPEC-002):
  - `{{$json.data.ativo}}` é `true`
  - `{{$json.data.temAlerta}}` é `true`  ← **gate exclusivo do alerta** (não sai quando a lista está vazia)
  - `{{$json.data.numero}}` não está vazio
- `false` → encerra (opt-out, sem nada a avisar, ou tenant sem `whatsapp_number`).

### [5] Evolution — enviar texto
- `POST https://alicia-evolution-api.rte6ms.easypanel.host/message/sendText/nina`.
- Auth: Header Auth `apikey` (credencial Evolution — **≠** service token da API).
- Body:
  ```json
  { "number": "{{$json.data.numero}}", "text": "{{$json.data.texto}}" }
  ```
- Idempotência: trigger é horário fixo; rodar 2× só reenviaria o mesmo texto (é leitura, sem efeito colateral). Multi-tenant futuro: trocar o `x-tenant-id` literal por loop sobre tenants ativos.

## Variáveis / credenciais
| O quê | Onde |
|---|---|
| `x-service-token` | credencial Header Auth "Nina API service token" (`106lKMqNprmKFB1k`) |
| `x-tenant-id` | literal `00000000-0000-0000-0000-000000000001` |
| Evolution `apikey` | credencial Header Auth da instância `nina` |
| Número destino | resposta (`numero` = `Tenant.whatsappNumber`) |

## Opt-out / configuração por tenant (sem migração)
A API lê flags em `Config` (key-value já existente; ausente = ativo; `"false"` = inativo):
- `alerta_vencimentos_ativo` — desliga o alerta de vencimentos.
- `alerta_aportes_ativo` — desliga o alerta de aporte/meta.
- `alerta_aguardando_ativo` — desliga o follow-up "aguardando".

Além disso, `temAlerta` (na própria resposta) evita ruído: lista vazia → IF barra → não envia.

## Status: PUBLICADO e ATIVO (Tiago, 2026-06-23)
Workflow **`b4gopjjyGKMrCJaP`** (`Nina — Alertas Proativos`) criado pelo MCP do n8n (9 nós, `validate_workflow` → `{ valid: true, nodeCount: 9 }`, zero erros/warnings) e **publicado + ativado pelo Tiago** em 2026-06-23. Credencial do **Evolution já atualizada** (nó `Enviar no WhatsApp`).

**Pendências p/ funcionar E2E em prod:**
1. Nó **Buscar Alerta** → confirmar a credencial **"Nina API service token"** selecionada — o `create_workflow_from_code` não persiste o bind do `httpRequest` (igual digest). Sem ela, as execuções agendadas dão **401**.
2. **Redeploy da API** a partir do `main` (PR #34): os endpoints `/resumo/vencimentos|aportes|follow-ups` só existem após o deploy; antes disso o `Buscar Alerta` recebe **404**. *(Sondagem externa não confirma o deploy — o middleware devolve 401 em qualquer rota.)*
3. **Validar:** com a API no ar e `Tenant.whatsappNumber` preenchido, rodar **Execute** em cada gatilho (ou *Test workflow*) → deve responder 200 e enviar quando `temAlerta`. Ou criar uma conta atrasada / meta atrasada / tarefa `AGUARDANDO` vencida e conferir.

## Restrições (espelham o digest e a SPEC-004)
- Envia **só pro dono** (privado), nunca grupo — texto tem nome de cliente/recado (LGPD).
- Sem LLM no caminho (leitura + template na API; barato e determinístico).
- **Aportes**: o `texto` sempre inclui o disclaimer educativo (guardrail do coach — garantido na API, não no n8n).
