# HARNESS — SPRINT 9 / SPEC-007 (Data/timezone do orb + perguntar data/hora)

> 2026-06-24 · Scrum master: Claude · Branch `feat/spec-007-data-timezone-orb`

## Escopo entregue (backend do app; n8n não tocado)
- **Util `common/datas/datas-br.util.ts`:** `agoraSaoPaulo()` (ISO SP-local com `-03:00`, via Intl) + `ancorarDataBR()` (ancora data do LLM ao fuso BR: date-only→meia-noite BR; com offset→mantém; Z/UTC→mesmo dia BR — corrige o off-by-one).
- **`nina.service.ts`:** `nowIso = agoraSaoPaulo()`; aplica `ancorarDataBR` em vencimento/inicio/fim/dataHora/prazo; **pergunta** quando falta vencimento (conta) / início (agenda) / dataHora (lembrete) em vez de chutar `nowIso`; exibição com `timeZone: 'America/Sao_Paulo'` explícito.
- **`openrouter.adapter.ts` (prompt):** a data atual já vem com `-03:00`; emitir datas com `-03:00`; perguntar se faltar data/hora essencial (não inventar).

## Provas
- **`tsc --noEmit`** verde · **`yarn test` 84/84** (13 novos: 8 util + 5 nina SPEC-007).
- Cobertura: `agoraSaoPaulo` offset/bordas; `ancorarDataBR` (date-only, UTC-midnight, com-offset, sem-zona, vazio); prova do off-by-one (`...Z` → render BR = dia 30, não 29); pergunta-quando-falta (conta/agenda/lembrete não gravam); ancoragem no payload; nowIso com `-03:00`.
- **Auditoria (2 agentes) — APROVADO (após correções):**
  - **Correção/não-regressão:** APROVADO. Refactor `executarNlu` (nowIso removido) sem regressão; 12 ações intactas; confirmação/`pendente` ok; prompt ok; n8n não tocado.
  - **Caça-bug:** achou e **corrigimos**: 🔴 **[BLOQUEADOR]** `toLocaleDateString('pt-BR')` sem `{ timeZone }` (×2) → exibição dependia do fuso do servidor → **agora explícito `America/Sao_Paulo`**; 🟠 **[MAIOR]** fallback `?? new Date().toISOString()` (UTC) no `executar` → trocado por `agoraSaoPaulo()`.

## Pendente (Tiago)
- **Deploy da API** → validar no orb: "dia 30" → **30/07** (não 29); "marca uma reunião" → **pergunta o horário** (não chuta 9h).

## Notas
- **Dado legado:** as 2-3 contas de teste já gravadas em UTC (água/luz/internet) seguem exibindo -1 dia até serem regravadas — é dado legado, não migrado (fora de escopo).
- **WhatsApp (n8n) inalterado:** já acertava (passa SP-local `-03:00` via `$now.setZone`). O premortem do sistema (rodando) verifica `toLocaleDateString` sem tz em outros pontos (front, outros services).
