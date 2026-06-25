# Nina — Alerta de Custo LLM (SPEC-012 §2 — 14D)

> Alerta agendado (Schedule diário) que consulta o custo do dia com modelos na API e avisa no WhatsApp privado do tenant **só quando passa do teto** (`temAlerta`). Espelha os Alertas Proativos (`nina-alertas.md`): leitura + envio, sem cérebro/LLM, sem gatilho. A diferença é a rota (`/resumo/custo`) e a unidade (**US$**, não R$).

## Fluxo

```
[Cron diário 20h] → [HTTP GET /resumo/custo] → [IF ativo && temAlerta && numero] → [Evolution sendText]
                                                              └→ (false) → fim (opt-out / dentro do teto / sem número)
```

Schedule único; o IF barra quando o custo está dentro do teto (lista vazia → não envia).

## Nós

### [1] Schedule Trigger
- Tipo `n8n-nodes-base.scheduleTrigger` (v1.3). Cron de **6 campos** (`[seg] [min] [hora] [dia-mês] [mês] [dia-sem]`), tz da instância (`America/Sao_Paulo`).
- **Custo diário:** `0 0 20 * * *` (todo dia 20:00 — fim do expediente, fecha o gasto do dia). Ajustável.

### [2] HTTP Request — buscar alerta
- `GET https://nina-api.rte6ms.easypanel.host/api/v1/resumo/custo`.
  - Query opcional `dias` (default `1` = só hoje). Ex.: `?dias=7` para os últimos 7 dias.
- Auth: Header Auth → credencial **"Nina API service token"** (id `106lKMqNprmKFB1k`, envia `x-service-token`).
- Header literal: `x-tenant-id: 00000000-0000-0000-0000-000000000001` (1º tenant).
- Resposta envelopada (`{ data: {...} }` — ResponseInterceptor). Acessar via `$json.data.*`:
  ```json
  { "data": { "ativo": true, "numero": "5543...", "temAlerta": true,
              "custoMicroUsd": 7500000, "tetoMicroUsd": 5000000,
              "dia": "25/06", "texto": "💸 *Custo LLM hoje: US$ 7.50* ..." } }
  ```
  > Valores em **microdólares** (inteiro, evita float): `custoMicroUsd / 1_000_000` = US$. O `texto` já vem formatado em US$.

### [3] IF — só envia se ativo, acima do teto e com número
- Condição (AND), `typeValidation: loose` + `looseTypeValidation: true` (gotcha do IF herdado da SPEC-002 — ver `nina-digest.md`):
  - `{{$json.data.ativo}}` é `true`
  - `{{$json.data.temAlerta}}` é `true`  ← **gate exclusivo** (só dispara acima do teto)
  - `{{$json.data.numero}}` não está vazio
- `false` → encerra (opt-out, gasto dentro do teto, ou tenant sem `whatsapp_number`).

### [4] Evolution — enviar texto
- `POST https://alicia-evolution-api.rte6ms.easypanel.host/message/sendText/nina`.
- Auth: Header Auth `apikey` (credencial Evolution — **≠** service token da API).
- Body:
  ```json
  { "number": "{{$json.data.numero}}", "text": "{{$json.data.texto}}" }
  ```
- Idempotência: trigger é horário fixo; rodar 2× só reenviaria o mesmo aviso (leitura, sem efeito colateral). Multi-tenant futuro: trocar o `x-tenant-id` literal por loop sobre tenants ativos.

## Variáveis / credenciais
| O quê | Onde |
|---|---|
| `x-service-token` | credencial Header Auth "Nina API service token" (`106lKMqNprmKFB1k`) |
| `x-tenant-id` | literal `00000000-0000-0000-0000-000000000001` |
| Evolution `apikey` | credencial Header Auth da instância `nina` |
| Número destino | resposta (`numero` = `Tenant.whatsappNumber`) |

## Opt-out / configuração por tenant (sem migração)
A API lê a flag em `Config` (key-value já existente; ausente = ativo; `"false"` = inativo):
- `alerta_custo_ativo` — desliga o alerta de custo.

O **teto** hoje é constante na API (`TETO_MICRO_USD_DIA = 5_000_000` = US$5,00/dia); no futuro pode virar Config por tenant (`custo_teto_micro_usd` — ver SPEC-012 §2). Além disso, `temAlerta` (na própria resposta) evita ruído: gasto dentro do teto → IF barra → não envia.

## Pré-requisitos
- **Telemetria gravada (14C):** o custo só é > 0 depois que `UsoLlm` passa a ser gravado a cada chamada LLM (slice 14C da SPEC-012). Antes disso o alerta nunca dispara (custo = 0).
- **Redeploy da API:** a rota `/resumo/custo` só existe após o deploy do `main` que inclui a SPEC-012; antes disso o `Buscar Alerta` recebe 404.

## Status: DOC (workflow não criado)
Apenas a documentação do padrão. Criar o workflow no n8n (via MCP) e selecionar as credenciais é **handoff do Tiago** (cron opcional — SPEC-012 §4). Espelhar `nina-alertas.md` (mesmos nós, trocando rota e cron).

## Restrições (espelham os alertas e a SPEC-012)
- Envia **só pro dono** (privado), nunca grupo.
- Sem LLM no caminho (leitura + template na API; barato e determinístico).
- Unidade é **US$** (custo de provedor LLM), não R$ — não confundir com o financeiro do tenant.
