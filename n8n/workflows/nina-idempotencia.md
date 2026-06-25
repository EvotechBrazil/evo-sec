# Nina — Idempotência de escrita / dedup de reentrega (SPEC-013, slice 13D)

> **Design — NÃO aplicado no n8n.** O integrador (Claude) aplica via MCP no *draft* do workflow
> `Dqm3pJo2MNHcRZ1R`; **Tiago publica**.
>
> Fecha o achado **#9** do premortem (MÉDIO): o Evolution **reentrega** o mesmo evento
> (reconexão / `history-sync` / retry do webhook) com o **mesmo `key.id`**. Hoje cada reentrega
> roda o fluxo de novo → **duplica** lançamento (movimentação/conta/aporte). Duas camadas se cobrem:
> 1. **Borda (este doc):** o `Filtro de Gatilho` descarta o `key.id` já visto (ring buffer no
>    `staticData`) **antes de qualquer roteamento** → a reentrega nem chega no LLM/HTTP.
> 2. **Backend (slices 13A/13B/13C):** mutação financeira é idempotente por
>    `idempotencyKey` único `@@unique([tenantId, idempotencyKey])` — **defesa real** mesmo se a borda
>    falhar (ex.: `staticData` resetado por restart do n8n). Por isso a borda **também** passa o
>    `key.id` como `idempotencyKey` no body das 3 escritas.

## Onde mexer

Workflow **`Dqm3pJo2MNHcRZ1R`** (brain WhatsApp, 14+ nós). Dois pontos:

```
Recebe Evolution → Valida Segredo (webhook) → Filtro de Gatilho (isolamento)  ← (1) dedup aqui
                                                      │
                                                      ▼  (rota: texto / midia / pronta / audio)
                                          … → API: registrar movimentacao  ← (2) idempotencyKey
                                          … → API: criar conta             ← (2) idempotencyKey
                                          … → Aportar meta                 ← (2) idempotencyKey
```

> O id da mensagem nasce como `data.key?.id` no payload do Evolution; o filtro **já** o propaga
> adiante como `mediaKey` (campo `mediaKey: data.key?.id ?? null`, acessível como `$json.mediaKey`).
> O ramo de áudio (`Baixar Audio`) já consome `$json.mediaKey` — então é o mesmo campo que as
> 3 escritas usam como `idempotencyKey`.

---

## (1) Dedup no `Filtro de Gatilho (isolamento)` (Code v2)

### Onde inserir o trecho
O nó já resolve `const data = item.body?.data ?? item.data ?? item;`, faz a guarda
`if (!fromMe || !mesmoNumero(...)) { return []; }` e logo depois pega
`const store = $getWorkflowStaticData('global');` + `const agora = Date.now();`.

Cole o bloco abaixo **imediatamente após** essas duas linhas (`store` e `agora` **já resolvidos**) e
**ANTES** do primeiro retorno de roteamento — ou seja, **antes** do `if (tipoMidia === 'audio') { … }`.

Isso é obrigatório porque o filtro tem **vários pontos de retorno** (áudio, abertura, `fim`, sessão
ativa, fora-de-sessão). A dedup precisa rodar **uma vez, no caminho comum**, depois do `store` e antes
de qualquer `return` — assim **qualquer** reentrega (texto **ou** áudio **ou** abertura) é cortada uma
única vez, sem depender de em qual ramo ela cairia.

> ⚠️ Tem que ficar **depois** da guarda `fromMe/mesmoNumero` (não gastar buffer com tráfego de
> terceiro que já é descartado) e **depois** de `const store = …` (o bloco usa `store`). Se mover para
> antes do `store`, `store` é `undefined` → erro.

### jsCode da dedup (pronto p/ colar)

```js
// ---- DEDUP de reentrega (SPEC-013): descarta key.id já visto antes de rotear ----
// O Evolution reentrega o mesmo evento (reconexão / history-sync / retry) com o MESMO key.id.
// Ring buffer dos últimos ~50 ids no staticData. Sem id → não dá pra deduplicar: segue normal.
const msgId = data.key?.id ?? null;
if (msgId) {
  const vistos = Array.isArray(store.vistos) ? store.vistos : [];
  if (vistos.includes(msgId)) {
    return []; // reentrega do mesmo key.id → encerra em silêncio (sem LLM, sem gravar, sem dobrar)
  }
  vistos.push(msgId);
  store.vistos = vistos.slice(-50); // mantém só os 50 mais recentes (cap do buffer)
}
```

### Por que assim
- **`return []`** encerra o fluxo silenciosamente (mesma convenção do isolamento/segurança: vazio =
  ignora, sem LLM e sem gravação). A reentrega para aqui, **antes** de `Roteia` e dos HTTP de escrita.
- **`store.vistos` (array, cap 50)** vive no `$getWorkflowStaticData('global')` — mesmo lugar de
  `store.sessaoAtivaAte`/`store.hist`. Persiste entre execuções sem custo de API. `slice(-50)` corta
  pelo fim → mantém os **50 mais recentes** (FIFO simples). 50 cobre folga a reentrega típica
  (segundos a minutos); buffer pequeno não incha o `staticData`.
- **`msgId` ausente** (`data.key?.id` indefinido) → **não** deduplica (não há chave estável); a
  mensagem segue o fluxo normal. Evita travar mensagens legítimas sem `key.id`.
- **Idempotente quanto ao próprio buffer:** marca-se `vistos` **uma vez**, na 1ª passagem; a 2ª
  (reentrega) cai no `includes` e retorna antes de qualquer escrita.
- Não interfere em sessão/memória: roda **depois** de `store` existir e **só** lê/escreve a chave nova
  `store.vistos`; `sessaoAtivaAte`/`hist` seguem como estão.

> Nota: a guarda `fromMe/mesmoNumero` (e o `Valida Segredo`) já rodaram antes — então o buffer só
> registra mensagens do próprio dono que passariam adiante, não tráfego de terceiro/forjado.

---

## (2) Passar `idempotencyKey` nos 3 nós HTTP de escrita

Em cada um dos nós abaixo, **acrescentar um campo no JSON do body** (`specifyBody: json`,
`jsonBody`). O valor é o **mesmo `key.id`** que o filtro propaga como `mediaKey` — então a expressão é
`{{ $json.mediaKey }}` (o id que o filtro colocou no item). O **nome do campo no body** é exatamente
`idempotencyKey` (o backend mapeia p/ `idempotency_key` — contrato dos slices 13B/13C).

| # | Nó (name no workflow) | Mutação no backend | Campo a **adicionar** no body | Valor (expressão) |
|---|---|---|---|---|
| 1 | `API: registrar movimentacao` | `POST /api/v1/financeiro/movimentacoes` | `idempotencyKey` | `{{ $json.mediaKey }}` |
| 2 | `API: criar conta` | `POST /api/v1/financeiro/contas` | `idempotencyKey` | `{{ $json.mediaKey }}` |
| 3 | `Aportar meta` | `POST /api/v1/financas/metas/:id/aportar` | `idempotencyKey` | `{{ $json.mediaKey }}` |

Exemplo (formato do body já usado nesses nós — **só somar a linha `idempotencyKey`**, manter os
campos existentes):

```js
// jsonBody do nó "API: registrar movimentacao" (exemplo — preservar os demais campos do nó)
{{ ({
  "descricao": $json.descricao,
  "valorCentavos": $json.valorCentavos,
  "tipo": $json.tipo,
  // ... demais campos atuais do nó ...
  "idempotencyKey": $json.mediaKey   // ← SPEC-013: key.id da mensagem (dedup no backend)
}) }}
```

### Detalhes / gotchas
- **De onde vem o id no fluxo:** o filtro grava `mediaKey: data.key?.id ?? null`. Se o nó de escrita
  perdeu o item original do filtro (passou por LLM/Set que dropou campos), referenciar a fonte estável:
  `{{ $('Filtro de Gatilho (isolamento)').first().json.mediaKey }}` (mesma ideia do `Monta Resposta`,
  que faz `$('Filtro de Gatilho (isolamento)').first().json`). Use `$json.mediaKey` quando o campo
  ainda estiver no item da escrita; senão, a forma com `$('Filtro…')`.
- **`mediaKey` nulo:** se `data.key?.id` veio nulo (caso raro), `idempotencyKey` vai `null` → o backend
  trata `idempotencyKey` ausente/nulo como **sem dedup** (slices 13B/13C: nullable, comportamento
  atual). Não quebra a escrita; só não há proteção de dobra naquele caso — exatamente o caso em que a
  borda também não deduplicaria (sem `key.id` estável).
- **Por que o mesmo id serve para os 3:** o `@@unique` no backend é `(tenantId, idempotencyKey)`. O
  `tenantId` já vai no header/token de cada chamada; o `key.id` é único por mensagem do WhatsApp. Como
  cada mensagem dispara **no máximo uma** das 3 mutações, não há colisão entre tipos — a 2ª entrega da
  **mesma** mensagem bate na **mesma** linha → no-op (devolve o registro existente, sem dobrar saldo /
  ADR-007).

---

## Handoff
- **Integrador (Claude, via MCP):** aplicar no **draft** de `Dqm3pJo2MNHcRZ1R`:
  1. Inserir o bloco de dedup no `jsCode` do `Filtro de Gatilho (isolamento)` no ponto indicado
     (após `store`/`agora`, antes do `if (tipoMidia === 'audio')`).
  2. Somar o campo `idempotencyKey: $json.mediaKey` no `jsonBody` dos 3 nós HTTP de escrita.
  3. `validate_workflow` → esperar `valid: true` (sem novos erros/warnings) **sem publicar**.
- **Tiago:** publicar o workflow. Pré-requisito p/ a camada backend valer: **redeploy da API** (migration
  do slice 13A roda no entrypoint — `idempotency_key` + índice único).
- **Validar E2E:** mandar uma escrita pela Nina (ex.: "nina, lancei 50 reais de almoço"); reenviar o
  **mesmo** payload (mesmo `key.id`) — pelo Evolution ou *re-run* do nó webhook. Esperado: a 2ª passa
  no `Filtro de Gatilho` e retorna **`[[]]`** (parou na dedup, não chegou no HTTP). Forçar a borda a
  falhar (limpar `store.vistos` / simular restart) e reenviar → o backend dedupa por `idempotencyKey`:
  **1 só** movimentação/conta/aporte (saldo sem dobra).

## Referências
- SPEC: `.ai/SPECS/SPEC-013-idempotencia.md` (slice 13D; backend 13A/13B/13C).
- Filtro vivo: `n8n/workflows/nina-main.workflow.ts` (nó `Filtro de Gatilho (isolamento)`,
  `$getWorkflowStaticData('global')`, `mediaKey: data.key?.id`).
- Premortem #9: `.ai/PREMORTEMS/PREMORTEM-sistema-2026-06-24.md`.
- Convenção `return []` = encerra silencioso: `n8n/workflows/nina-webhook-seguranca.md`.
