# SPEC-007 — Data/timezone do orb (off-by-one) + perguntar data/hora quando faltar

> Status: **EM IMPLEMENTAÇÃO** (Sprint 9) · Scrum master: Claude · 2026-06-24

## 1. Problema (causa confirmada, lendo o código)
Na voz do app (orb → `POST /nina/mensagem`):
1. **🐛 Data off-by-one:** "dia 30" virou **29/07**. Causa: `nina.service.ts:95` passa `new Date().toISOString()` (**UTC**, ex. `...T13:30:00Z`) que o `openrouter.adapter.ts:45` rotula como `"Data atual (America/Sao_Paulo)"` — **mismatch**. O `gemini-2.5-flash-lite` emite `vencimento` em **meia-noite UTC** (`2026-07-30T00:00:00Z`) → exibido no fuso BR (UTC-3) vira **29/07 21:00**. O WhatsApp (n8n) acerta porque passa SP-local com `-03:00` (`$now.setZone(...)`), visto em prod (`2026-06-18T00:00:00-03:00`).
2. **UX — chuta default em vez de perguntar:** `nina.service.ts:199` faz `vencimento ?? nowIso` (assume hoje) e `:134` `inicio ?? nowIso` (assume agora) — por isso "marca uma reunião" virou "amanhã 9h" sem perguntar.

## 2. Escopo (backend — módulo `nina` + util; n8n não é tocado)
- **Novo util `common/datas/datas-br.util.ts`:**
  - `agoraSaoPaulo(now?): string` — ISO com offset **`-03:00`** e wall-clock de São Paulo (Brasil é UTC-3 fixo desde 2019). Espelha o `$now.setZone` do n8n.
  - `ancorarDataBR(iso?): string | undefined` — normaliza uma data emitida pelo LLM ao fuso BR, evitando off-by-one: **date-only** (`YYYY-MM-DD`) → `T00:00:00-03:00`; **já tem offset** (`±HH:MM`) → mantém; **UTC/`Z` em meia-noite** → mesmo dia em meia-noite BR; demais → reexpressa o wall-clock com `-03:00`.
- **`nina.service.ts`:**
  - `nowIso = agoraSaoPaulo()` (em vez de `new Date().toISOString()`).
  - Aplicar `ancorarDataBR` em `vencimento` (criar_conta), `inicio`/`fim` (criar_agenda), `dataHora` (criar_lembrete), `prazo` (tarefa/meta) **antes de gravar**.
  - **Perguntar quando faltar** (não chutar): criar_conta sem `vencimento` → "Pra quando é o vencimento?"; criar_agenda sem `inicio` → "Que dia e horário?"; criar_lembrete sem `dataHora` → "Pra quando te lembro?".
- **`openrouter.adapter.ts` (SYSTEM prompt):** "A data atual já vem com offset `-03:00`. Toda data que você emitir (`vencimento`, `dataHora`, `inicio`, `fim`, `prazo`) **com offset `-03:00`**; dia sem hora = `T00:00:00-03:00`. Se faltar data/hora essencial, **NÃO invente — pergunte** (use `conversa`)."

## 3. Critérios de aceite (verificáveis)
- [ ] `agoraSaoPaulo()` retorna ISO terminando em `-03:00` com o relógio de São Paulo (testar contra um instante fixo).
- [ ] `ancorarDataBR`: `"2026-07-30"` → `"2026-07-30T00:00:00-03:00"`; `"2026-07-30T00:00:00Z"` → dia **30** em BR (`...T00:00:00-03:00`), **não 29**; `"2026-07-30T14:00:00-03:00"` → mantém.
- [ ] **Off-by-one resolvido:** dado "dia 30" + data atual SP, o `vencimento` gravado cai em **30/07** (verificar via `ancorarDataBR` + render BR).
- [ ] **Perguntar:** criar_conta sem vencimento → resposta de pergunta + `pendente:null` (não grava com hoje); idem criar_agenda sem inicio e criar_lembrete sem dataHora.
- [ ] WhatsApp (n8n) inalterado (continua acertando). Sem `any` público; `tsc` verde; `yarn test` verde.

## 4. Harness
- **Unit util:** `agoraSaoPaulo` offset/wall-clock; `ancorarDataBR` (date-only, UTC-midnight, com-offset, datetime real).
- **nina.service:** criar_conta/agenda/lembrete **sem** a data → pergunta (não chama o service de criação); **com** a data → grava com `ancorarDataBR` aplicado (offset BR). Mock dos services + ContextoService + LLM.
- Resultado em `.ai/HARNESS_RESULTS/SPRINT-9-spec-007-data-timezone-orb.md`.

## 5. Fora de escopo
- Exibição no front (o backend ancorando ao fuso BR resolve a origem; o premortem em background cobre o display do front se houver double-shift).
- Migrar dados antigos (as 2-3 contas de teste com data UTC ficam como estão; novas saem certas).
- Riscos → `PREMORTEM-spec-007-data-timezone-orb.md`.
