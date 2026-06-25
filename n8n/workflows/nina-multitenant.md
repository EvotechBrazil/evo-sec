# Nina — Multi-tenant no n8n (SPEC-016, slice 16B — design)

> **Design — NÃO aplicado no n8n.** O integrador (Claude) aplica via MCP nos *drafts* dos
> workflows; **Tiago publica**. Este doc só desenha os nós/expressões.
>
> Fecha o achado **#5** do `PREMORTEM-sistema-2026-06-24.md`: `x-tenant-id`, `TENANT_ID` e
> `OWN_NUMBER` estão **hardcoded** em todos os workflows. No **2º tenant**, mensagem de qualquer
> dono vira tenant #1, e digest/alertas/lembretes/custo entregam dados ao **WhatsApp errado**
> (vazamento entre tenants — LGPD). A correção tem duas frentes que se espelham:
> 1. **Brain (`Dqm3pJo2MNHcRZ1R`):** resolver o `tenantId` **pelo número** (lookup na API), em vez
>    do literal — cada mensagem usa o tenant do número que mandou.
> 2. **Crons (digest/alertas/lembretes/custo):** **iterar** sobre os tenants ativos — um envio por
>    tenant, sempre com o `x-tenant-id` **e** o `numero` **do mesmo tenant**.
>
> Depende dos endpoints do slice **16A** (backend, outro agente):
> - `GET /tenants/resolver?numero=<digits>` → `{ tenantId, timezone, nome }` (404 se não acha).
> - `GET /tenants/ativos` → `[{ tenantId, numero, timezone, nome }]`.
> - Ambos: auth **service-token** (`x-service-token`), **sem** `x-tenant-id` (é o lookup que
>   *descobre*/lista o tenant — não é tenant-scoped). Resposta **envelopada** pelo `ResponseInterceptor`
>   → acessar via `$json.data.*` (objeto no `resolver`, **array** em `ativos`).

---

## Compatibilidade mono-tenant (invariante das duas frentes)

Com **1 tenant** cadastrado (estado atual): o `resolver` devolve **o mesmo** tenant de hoje
(`00000000-…-0001`, pelo `whatsappNumber`); o loop dos crons roda **1 vez**. Comportamento idêntico
ao atual — a mudança só "acorda" quando entra o 2º tenant. Nenhuma migração de dado.

---

# Parte 1 — Brain dinâmico (`Dqm3pJo2MNHcRZ1R`)

## 1.1 Estado atual (de onde sai o número)

O `Filtro de Gatilho (isolamento)` (Code v2) tem a config **inline literal**:

```js
const cfg = {
  TENANT_ID: '00000000-0000-0000-0000-000000000001',  // ← literal (a remover do roteamento)
  OWN_NUMBER: '5543999864409',                         // ← literal (gate self-chat)
  GATILHO_CODIGO: 'nina',
  SESSAO_MINUTOS: 30,
};
```

e propaga, em **todo** item que segue adiante (`baseItem(...)`):

```js
{ tenantId: cfg.TENANT_ID, rota, tipoMidia, texto, mediaKey, numero: remoteJid, remetente, recebidoEm }
```

> Ou seja, **`numero` (= `remoteJid`, só dígitos) já está no item** — é exatamente o input do
> `/tenants/resolver`. O `tenantId` hoje é o literal `cfg.TENANT_ID`; vamos **substituí-lo** pelo
> resolvido. (`OWN_NUMBER` continua sendo o gate de self-chat por enquanto — ver §1.5.)

Cadeia viva (STATE.md, 43 nós):

```
Recebe Evolution → Valida Segredo (webhook) → Filtro de Gatilho (isolamento)
   → Nina (OpenRouter)  [JSON {acao,dados,resposta}]
   → Interpreta Acao → Roteia Acao (switch)
       → API: criar recado / criar tarefa / criar lembrete / criar conta / criar compromisso
       → API: criar meta / Aportar meta / API: registrar movimentacao
       → Listar metas / Listar agenda / Cancelar compromisso   (leituras)
   → Finaliza Resposta → Modo de Resposta (texto sendText | áudio ElevenLabs→sendWhatsAppAudio)
```

Todos os nós `API: *` / `Listar *` / `Cancelar *` hoje mandam **dois** headers de auth:
`x-service-token` (cred **"Nina API service token"** `106lKMqNprmKFB1k`) **+**
`x-tenant-id: 00000000-0000-0000-0000-000000000001` (**literal** — é o que vamos trocar).

## 1.2 Novo nó: `Resolver Tenant` (HTTP GET)

Inserir **um** nó HTTP **logo após** o `Filtro de Gatilho (isolamento)` e **antes** do `Nina
(OpenRouter)` — no caminho comum, para que **todas** as rotas (texto/midia/pronta/audio) já carreguem
o tenant resolvido.

- **Tipo:** `n8n-nodes-base.httpRequest` (v4.4).
- **Nome:** `Resolver Tenant`.
- **Método/URL:**
  `GET https://nina-api.rte6ms.easypanel.host/api/v1/tenants/resolver`
- **Query string** (`sendQuery: true`): `numero` = `{{ $json.numero }}`
  - (`numero` vem do filtro = `remoteJid` só dígitos; o backend tolera o 9º dígito BR, igual ao filtro.)
- **Auth:** Header Auth → credencial **"Nina API service token"** (`106lKMqNprmKFB1k`, envia
  `x-service-token`). **NÃO** mandar `x-tenant-id` aqui (é o lookup que *descobre* o tenant).
- **`options.response.fullResponse: true`** (ou manter erro on-fail) para conseguir tratar o **404**
  no nó seguinte — ver §1.4.
- **Resposta** (envelopada): `{ "data": { "tenantId": "...", "timezone": "America/Sao_Paulo", "nome": "..." } }`
  → o tenant resolvido é `{{ $json.data.tenantId }}`.

> **Propagar o tenant resolvido:** as rotas `texto/midia/audio` passam pelo LLM e por Sets que podem
> dropar campos, então **não** confie em `$json` lá na frente. Referencie sempre a **fonte estável**:
> `{{ $('Resolver Tenant').first().json.data.tenantId }}`
> (mesmo padrão que o `Monta Resposta`/`Responder Audio` já usam com `$('Filtro de Gatilho…')` e
> `$('Recebe Evolution')`). Opcional: um Set logo após o `Resolver Tenant` fixando
> `tenantId = {{ $('Resolver Tenant').first().json.data.tenantId }}` para encurtar as expressões.

## 1.3 Trocar o header literal → tenant resolvido (nós de escrita E leitura)

Em **cada** nó que hoje manda `x-tenant-id` literal, trocar **só o value do header** `x-tenant-id`:

| de (literal) | para (expressão) |
|---|---|
| `00000000-0000-0000-0000-000000000001` | `{{ $('Resolver Tenant').first().json.data.tenantId }}` |

Manter o `x-service-token` (cred) e todo o resto do body **iguais**. Nós a alterar (nomes vivos —
STATE.md; o ramo financeiro é o da SPEC-003 publicada + idempotência 13D):

| # | Nó (name no workflow) | Tipo de chamada |
|---|---|---|
| 1 | `API: criar recado` | escrita |
| 2 | `API: criar tarefa` | escrita |
| 3 | `API: criar lembrete` | escrita |
| 4 | `API: criar conta` | escrita |
| 5 | `API: criar compromisso` | escrita |
| 6 | `API: criar meta` | escrita |
| 7 | `Aportar meta` | escrita |
| 8 | `API: registrar movimentacao` | escrita |
| 9 | `Listar metas` | leitura |
| 10 | `Listar agenda` | leitura |
| 11 | `Cancelar compromisso` | escrita |

> ⚠️ **Conferir todos os nós HTTP que batem em `/api/v1/*`** no workflow vivo (são os que têm o
> header `x-tenant-id`). A tabela reflete o STATE.md; se o draft tiver nó renomeado/novo, aplicar a
> mesma troca. **Não** mexer nos nós que falam com **Evolution** (`sendText`, `getBase64FromMedia…`,
> `sendWhatsAppAudio`) nem com **OpenRouter/ElevenLabs** — esses não têm `x-tenant-id`.

> O campo `tenantId` que o filtro injeta no item (`cfg.TENANT_ID`) deixa de ser a fonte de verdade
> do header. Pode-se **manter** o campo (inofensivo) ou trocar sua origem para
> `$('Resolver Tenant').first().json.data.tenantId`; o que **importa** é o **header** das chamadas API.

## 1.4 "Não achou tenant" (404)

Número não cadastrado → o `resolver` responde **404**. Como o gate de self-chat (`OWN_NUMBER`) ainda
roda **antes** (§1.5), na prática só chega aqui número do(s) dono(s) cadastrado(s); ainda assim,
blindar:

- Com `fullResponse: true`, inserir um **IF** `Tenant resolvido?` logo após o `Resolver Tenant`:
  - condição (`loose`): `{{ $('Resolver Tenant').first().json.data.tenantId }}` **notEmpty**
    (ou `{{ $json.statusCode }}` igual a `200`).
  - **true →** segue para o `Nina (OpenRouter)`.
  - **false →** **encerra** (sem LLM, sem escrita) — convenção `return []`/sem saída (mesmo
    princípio do `Valida Segredo`/dedup: vazio = ignora). Opcional: nó **NoOp**/Code só para **logar**
    `numero` (auditoria) antes de encerrar.
- Alternativa minimalista (sem IF): deixar o `Resolver Tenant` **falhar on-error** (404 derruba o
  branch) — encerra naturalmente, mas **sem log**. Preferir o IF para deixar rastro do número
  desconhecido.

> **Por que encerrar e não cair no tenant #1:** o bug atual é justamente "número desconhecido →
> tenant #1". Encerrar é a postura segura (não escreve no tenant errado). Cadastro de tenant é
> operação de onboarding (fora do n8n).

## 1.5 `OWN_NUMBER` (gate de self-chat) — escopo desta fase

O `Filtro de Gatilho` usa `OWN_NUMBER` para **isolar** (só self-chat do dono aciona a Nina; terceiro
→ `return []`). Nesta fase, **manter** o gate como está (segurança crítica — `nina-webhook-seguranca.md`).
A multi-tenancy "de verdade" do gate (aceitar o self-chat de **qualquer** dono ativo) é evolução
futura: o gate passaria a validar `mesmoNumero(remoteJid, <algum número de tenant ativo>)` em vez de
um único `OWN_NUMBER` — o que casa com o `resolver` (se resolve, é dono de algum tenant). **Fora do
escopo do 16B**; aqui o objetivo é **remover o `TENANT_ID` literal do roteamento** (resolver dinâmico),
não relaxar o isolamento. Registrar como follow-up.

---

# Parte 2 — Crons iterando sobre tenants ativos

Padrão **único** para os 4 crons. Hoje cada um é
`Schedule → (Set rota) → HTTP GET /resumo/<x>` (com `x-tenant-id` **literal** + `x-service-token`)
`→ IF (ativo && [temAlerta] && numero, loose) → Evolution sendText` (`number = data.numero`).

O que muda: **antes** do GET do alerta/digest, listar os tenants ativos e **dar loop**; cada iteração
usa o `tenantId` **e** o `numero` **daquele** tenant.

## 2.1 Forma nova (genérica)

```
[Schedule]
   → [Set rota]                         (só onde já existe — alertas; digest usa $json.rota)
   → [Listar Tenants Ativos]  (HTTP GET /tenants/ativos, service-token, SEM x-tenant-id)
   → [Split Out tenants]      (1 item por tenant)
   → [Loop Over Items (batch=1)]
        → [HTTP GET /resumo/<rota>]     x-tenant-id = {{ $json.tenantId }}  (do tenant da iteração)
        → [IF ativo && [temAlerta] && numero  (loose)]
            → (true)  [Evolution sendText]   number = {{ $json.data.numero }}
            → (false) volta ao Loop (próximo tenant)
        ↺ (loop) → próximo tenant
```

## 2.2 Nós novos / alterados

### [N1] `Listar Tenants Ativos` (HTTP GET) — inserir antes do GET do resumo
- **Tipo:** `n8n-nodes-base.httpRequest` (v4.4) · **Nome:** `Listar Tenants Ativos`.
- `GET https://nina-api.rte6ms.easypanel.host/api/v1/tenants/ativos`.
- **Auth:** Header Auth → cred **"Nina API service token"** (`106lKMqNprmKFB1k`). **SEM** `x-tenant-id`.
- Resposta envelopada: `{ "data": [ { "tenantId", "numero", "timezone", "nome" }, ... ] }`.

### [N2] `Split Out tenants` — explode o array em N itens
- **Tipo:** `n8n-nodes-base.splitOut` · **Nome:** `Split Out tenants`.
- **Campo a separar (`fieldToSplitOut`):** `data` (o array do envelope).
- Saída: **1 item por tenant**, cada um com `{ tenantId, numero, timezone, nome }` na raiz do `$json`.
  *(Alternativa: um nó **Code** `return $json.data.map(t => ({ json: t }))`.)*

### [N3] `Loop Over Items` (batch = 1) — processa tenant a tenant
- **Tipo:** `n8n-nodes-base.splitInBatches` · **Nome:** `Loop Tenants` · **batchSize: 1**.
- Garante **um envio por tenant** e isola o contexto de cada iteração (o `$json` dentro do loop é o
  **tenant corrente**). Saída "loop" → o GET do resumo; saída "done" → fim.
  *(Com Split Out já gerando N itens, o `splitInBatches` é opcional — os nós seguintes rodam 1x por
  item naturalmente. Use-o se quiser controle explícito/serial ou para encadear o "done".)*

### [G] `Buscar Resumo/Alerta` (HTTP GET) — **trocar o header literal**
- Mesmo nó de hoje (`Buscar Resumo`, `Buscar Alerta`, `Disparar Lembretes`, `Buscar Custo`), só muda
  o **value** do header `x-tenant-id`:

| de (literal) | para (expressão) |
|---|---|
| `00000000-0000-0000-0000-000000000001` | `{{ $json.tenantId }}` |

  > `$json.tenantId` = o tenant **da iteração** (vindo do Split Out / item corrente do loop). Se houver
  > um Set de `rota` **entre** o Split e o GET que troque o `$json`, referenciar a fonte estável:
  > `{{ $('Split Out tenants').item.json.tenantId }}` (ou `$('Loop Tenants').item.json.tenantId`).
  - URL e rota **inalteradas** (`/resumo/diario|semanal|vencimentos|aportes|follow-ups|custo` ou
    `POST /resumo/lembretes`). Auth `x-service-token` **mantida**.

### [IF] e [Evolution sendText] — **inalterados na lógica**
- O **IF** continua `data.ativo` && (`data.temAlerta` | `data.temLembrete`) && `data.numero` notEmpty,
  `typeValidation: loose` + `looseTypeValidation: true` (gotcha herdado — `nina-digest.md`).
- O **Evolution sendText** continua `number = {{ $json.data.numero }}`,
  `text = {{ $json.data.texto }}`. **`data.numero` vem do `/resumo`**, que é o `whatsappNumber` do
  **tenant do `x-tenant-id` que mandamos** → casa com o tenant da iteração (não usar o `numero` do
  `/tenants/ativos` aqui para evitar divergência; ambos são o mesmo número do tenant, mas a fonte
  canônica do envio é a resposta do `/resumo`).

## 2.3 Especificidades por cron

| Workflow | id | Schedule (mantém) | rota |
|---|---|---|---|
| Digest Matinal + Semanal | `rob9zT99LztycoVp` | diário `45 7 * * 1-5` · semanal `0 17 * * 5` | `diario` / `semanal` (já no `$json.rota`) |
| Alertas Proativos | `b4gopjjyGKMrCJaP` | venc. `0 0 8 * * *` · aportes `0 0 9 * * 1` · follow-ups `0 30 8 * * 1-5` | Set define `vencimentos`/`aportes`/`follow-ups` |
| Lembretes | `YTtIdxcNtgtENUgL` | `0 */15 * * * *` | `POST /resumo/lembretes` (muta) |
| Custo LLM | *(doc `nina-custo.md`; criar via MCP)* | `0 0 20 * * *` | `/resumo/custo` (já desenhado p/ inserir o loop de cara) |

- **Digest** tem **2 Schedules** convergindo: inserir o trio `Listar Tenants Ativos → Split Out →
  Loop` **depois** da convergência (um só), antes do `Buscar Resumo`. A `rota` (`$json.rota`) precisa
  **sobreviver** ao Split Out — como o Split troca o `$json` para o tenant, referenciar a rota pela
  fonte: `{{ $('<nó que setou rota>').item.json.rota }}` **ou** setar a rota **dentro** do loop.
  Caminho mais simples: manter **2 sub-fluxos** (diário/semanal) cada um com seu próprio trio de loop.
- **Alertas** tem 3 Schedules, cada um com `Set rota`: inserir o trio **após** o `Set rota` de cada
  ramo (ou um trio compartilhado, cuidando de preservar `rota` como acima).
- **Lembretes** é `POST` (muta: marca notificado / avança recorrência) — o loop por tenant é **mais
  importante** aqui: cada tenant marca **os seus** lembretes. `x-tenant-id = {{ $json.tenantId }}`
  garante que o POST mute só o tenant da iteração.
- **Custo** ainda é doc (workflow não criado): já nascer com o loop (mesmo trio) economiza retrabalho.

---

# Riscos / ordem / o que pode quebrar

- **Vazamento entre tenants (o risco nº 1 — LGPD).** A regra de ouro: **cada iteração usa o
  `tenantId` E o `numero` do MESMO tenant**. No brain, `x-tenant-id` = tenant resolvido **pelo número
  que mandou** a mensagem. Nos crons, `x-tenant-id` = `$json.tenantId` da iteração e o envio usa
  `data.numero` **da resposta daquele GET**. **Nunca** cruzar (ex.: `numero` do tenant A com `texto`
  gerado sob `x-tenant-id` do tenant B). Conferir no draft que **nenhum** `x-tenant-id` literal
  sobrou (busca por `00000000-0000-0000-0000-000000000001`).
- **Expressão referenciando o item errado dentro do loop.** Dentro de `splitInBatches`, `$json` é o
  **lote corrente**; após nós que trocam o `$json` (Set/LLM), usar `$('Split Out tenants').item.json.…`
  ou `$('Loop Tenants').item.json.…` em vez de `$json`. No brain, idem com `$('Resolver Tenant').first()`.
- **`data` como nome do array no Split Out.** O envelope do `/tenants/ativos` é `{ data: [...] }` →
  `fieldToSplitOut = data`. Se trocar por um Code, lembrar do `$json.data` (não `$json`).
- **IF normalizado p/ `strict` pelo MCP** quebra boolean `is true` → manter
  `typeValidation: loose` + `looseTypeValidation: true` (mesma pegadinha de digest/alertas/lembretes).
- **404 do resolver no brain** com número não cadastrado: o IF `Tenant resolvido?` encerra (não cai no
  tenant #1). Tratar; senão, on-error do HTTP derruba o branch (sem log).
- **Ordem de deploy (Tiago):** os endpoints `16A` (`/tenants/resolver`, `/tenants/ativos`) **só
  existem após o redeploy da API** (PR da SPEC-016). Aplicar os drafts **antes** do deploy é ok
  (ficam inativos / não publicados), mas **publicar/ativar só depois do deploy** — senão o
  `Resolver Tenant`/`Listar Tenants Ativos` recebe **404** (rota inexistente) ou **401** (token).
- **Credenciais não persistem via MCP.** Como em todos os workflows, o `httpRequest` não anexa a
  credencial Header Auth pelo MCP — **Tiago aponta na UI** os nós novos (`Resolver Tenant`,
  `Listar Tenants Ativos`) → **"Nina API service token"**. Sem isso → **401** nas execuções.
- **Mono-tenant preservado:** com 1 tenant, resolver devolve o de hoje e o loop roda 1x → mesma saída
  atual. Validar exatamente isso antes de cadastrar o 2º tenant.

## Handoff
- **Integrador (Claude, via MCP):** aplicar nos **drafts** (sem publicar), rodar `validate_workflow`
  (esperar `valid: true`, sem novos erros/warnings):
  1. **Brain `Dqm3pJo2MNHcRZ1R`:** inserir `Resolver Tenant` (+ IF `Tenant resolvido?`) após o filtro;
     trocar o value do header `x-tenant-id` dos ~11 nós `API:*`/`Listar*`/`Cancelar*` para
     `{{ $('Resolver Tenant').first().json.data.tenantId }}`. Conferir que não sobrou literal.
  2. **Crons (`rob9zT99LztycoVp`, `b4gopjjyGKMrCJaP`, `YTtIdxcNtgtENUgL` + criar o de custo):**
     inserir `Listar Tenants Ativos → Split Out tenants → Loop Tenants` antes do GET do resumo;
     trocar o value do header `x-tenant-id` do nó de GET para `{{ $json.tenantId }}` (ou
     `$('Split Out tenants').item.json.tenantId`); IF/Evolution inalterados.
- **Tiago:** **redeploy da API** (endpoints 16A) → **apontar credenciais** dos nós HTTP novos →
  **publicar/ativar** os workflows.

## Como validar (E2E)
- **Brain (mono-tenant):** "nina ping" do dono → resolve `00000000-…-0001`, responde "pong". Conferir
  na execução que o `Resolver Tenant` retornou 200 e que os nós API mandaram `x-tenant-id` =
  o tenant resolvido (não o literal). Número desconhecido (forjado/2º número não cadastrado) → IF
  barra → não escreve.
- **Brain (multi-tenant):** com 2 tenants cadastrados (números distintos), mandar do número do tenant
  B → as escritas vão para o tenant B (conferir no banco/`/resumo` de B), **não** para o #1.
- **Crons (mono-tenant):** Execute manual → loop roda 1x, envia ao número do tenant único (igual hoje).
- **Crons (multi-tenant):** 2 tenants ativos → Execute → 2 iterações, cada uma com o `x-tenant-id`
  e `data.numero` **do seu** tenant; tenant com `…_ativo=false`/sem alerta → IF barra **só aquele**,
  os outros seguem.

## Referências
- SPEC: `.ai/SPECS/SPEC-016-multitenant-n8n.md` (slice 16B; endpoints = 16A). Middleware valida
  `x-tenant-id` existe/ativo: SPEC-015 (#12).
- Premortem #5: `.ai/PREMORTEMS/PREMORTEM-sistema-2026-06-24.md`.
- Filtro/headers vivos: `n8n/workflows/nina-main.workflow.ts` (`Filtro de Gatilho (isolamento)`,
  `cfg.TENANT_ID`/`cfg.OWN_NUMBER`, `numero: remoteJid`) · STATE.md (nós `API:*` do brain vivo).
- Padrão cron + gotcha do IF `loose`: `nina-digest.md`, `nina-alertas.md`, `nina-lembretes.md`,
  `nina-custo.md`. Convenção `return []`/vazio = encerra: `nina-webhook-seguranca.md`,
  `nina-idempotencia.md`.
