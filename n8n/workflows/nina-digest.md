# Nina — Digest Matinal + Semanal (SPEC-002)

> Workflow agendado (Schedule) que busca o resumo proativo na API e envia no WhatsApp privado do tenant. **Não** depende do cérebro/gatilho — é só leitura + envio. Diário seg–sex 7h45, semanal sexta 17h.

## Fluxo

```
[Cron Diário 7h45 1-5]  ─┐
                          ├→ [HTTP GET /resumo/*] → [IF ativo && numero] → [Evolution sendText]
[Cron Semanal Sex 17h]  ─┘                                         └→ (false) → fim (opt-out / sem número)
```

São dois ramos independentes (dois Schedule Triggers) que convergem no mesmo par HTTP→IF→Evolution, OU dois sub-fluxos idênticos apontando para `/resumo/diario` e `/resumo/semanal`. Recomendado: **dois Schedule + um Switch** por rota, ou simplesmente duplicar o trio.

## Nós

### [1a] Schedule Trigger — Diário
- Tipo: `Schedule Trigger` · Cron: `45 7 * * 1-5` · Timezone: `America/Sao_Paulo`.
- Saída define a rota: `rota = "diario"`.

### [1b] Schedule Trigger — Semanal
- Cron: `0 17 * * 5` · Timezone: `America/Sao_Paulo` · `rota = "semanal"`.

### [2] HTTP Request — buscar resumo
- Método `GET` → `{{API_URL}}/resumo/{{ $json.rota }}`
  - Produção: `https://nina-api.rte6ms.easypanel.host/api/v1/resumo/diario` (ou `/semanal`).
- **Auth:** Header Auth → credencial **"Nina API service token"** (id `106lKMqNprmKFB1k`) — envia `x-service-token`.
- Header adicional: `x-tenant-id: 00000000-0000-0000-0000-000000000001` (literal, tenant do Rodrigo).
- Resposta vem **envelopada** no padrão da API (`{ data: {...} }` — ResponseInterceptor). Acesse sempre via `$json.data.*`:
  ```json
  { "data": {
      "ativo": true, "numero": "5543...", "dia": "19/06",
      "resumo": { ... }, "texto": "☀️ *Bom dia! Resumo de 19/06* ..."
  } }
  ```

### [3] IF — só envia se ativo e com número
- Condição (AND):
  - `{{$json.data.ativo}}` é `true`
  - `{{$json.data.numero}}` não está vazio
- `false` → encerra (opt-out via Config `digest_diario_ativo` / `digest_semanal_ativo` = "false", ou tenant sem `whatsapp_number`).

### [4] Evolution — enviar texto
- HTTP Request → `POST {{EVOLUTION_API_URL}}/message/sendText/{{instance}}`
  - Produção: `https://alicia-evolution-api.rte6ms.easypanel.host/message/sendText/nina`.
- **Auth:** Header Auth `apikey` (credencial Evolution — **≠** service token da API).
- Body:
  ```json
  {
    "number": "{{$json.data.numero}}",
    "text": "{{$json.data.texto}}"
  }
  ```
- Idempotência: o trigger é horário fixo; rodar 2x no mesmo minuto só reenviaria o mesmo texto (sem efeito colateral em dados — é leitura). Para multi-tenant futuro, trocar o `x-tenant-id` literal por um loop sobre os tenants ativos.

## Variáveis / credenciais
| O quê | Onde |
|---|---|
| `x-service-token` | credencial Header Auth **"Nina API service token"** (`106lKMqNprmKFB1k`) |
| `x-tenant-id` | literal `00000000-0000-0000-0000-000000000001` (1º tenant) |
| Evolution `apikey` | credencial Header Auth da instância `nina` |
| Número destino | vem da resposta (`numero` = `Tenant.whatsapp_number`) |

## Opt-out / configuração por tenant (sem migração)
A API lê flags em `Config` (key-value já existente):
- `digest_diario_ativo` = `"false"` desliga o diário (ausente = ativo).
- `digest_semanal_ativo` = `"false"` desliga o semanal.
- Número de destino = `Tenant.whatsapp_number` (já no schema).

## Pendência manual conhecida (limitação MCP n8n)
Criar/anexar credencial `httpHeaderAuth` via `addNode` é bloqueado pelo MCP (ver `.ai/STATE.md`). Ao importar este workflow:
1. Selecionar a credencial **"Nina API service token"** no nó [2] e a **Evolution** no nó [4] pela UI.
2. **Publish**.
3. Testar: executar o trigger manualmente (botão *Test workflow*) e confirmar a mensagem no WhatsApp.

## Restrições (espelham a skill de origem e a SPEC-002)
- Envia **só pro dono** (privado), nunca grupo — relatório tem nome de cliente/recado (LGPD).
- Não chama LLM no caminho do digest (é leitura + format na API; barato e determinístico).
- Seções vazias são omitidas pela API; nunca inventa volume.
