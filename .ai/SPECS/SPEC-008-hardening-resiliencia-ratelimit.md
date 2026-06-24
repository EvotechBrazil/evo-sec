# SPEC-008 — Onda 1: hardening backend (resiliência + rate-limiting)

> Status: **EM IMPLEMENTAÇÃO** (Sprint 10) · Scrum master: Claude · 2026-06-24
> Fecha 2 release-blockers do premortem (`.ai/PREMORTEMS/PREMORTEM-sistema-2026-06-24.md`), 100% no backend. As partes n8n (#3 onError) + #1 webhook HMAC + #2 backup vêm coordenadas com o Tiago.

## 1. Objetivo
- **#3 (parte backend) — Resiliência:** os 2 `fetch` externos (OpenRouter, ElevenLabs) hoje **não têm timeout** → no pior caso ~5 min presos num endpoint interativo de voz/chat; falha externa = silêncio. Dar **timeout + retry** e converter em erro tratado (503) p/ o cliente degradar (a voz do app já tem fallback p/ TTS do navegador).
- **#7 — Rate-limiting:** zero hoje → `/auth/login` aberto a brute-force e `/nina/*` a "denial-of-wallet" (cada chamada gasta LLM/TTS). Adicionar `@nestjs/throttler`.

## 2. Escopo
- **Resiliência** (`common/http/fetch-timeout.util.ts`): `fetchComTimeout(url, init?, timeoutMs)` (AbortController + setTimeout; em timeout/abort → lança erro tratável; sempre limpa o timer). `fetchComRetry` opcional: 1 retry só p/ 429/502/503/504 (backoff curto). Usar em `OpenRouterAdapter.intent` (~12s) e `ElevenLabsAdapter.tts` (~10s) — timeout vira `ServiceUnavailableException` (orb cai no fallback de voz do navegador; `/nina/mensagem` responde 503).
- **Rate-limiting** (`@nestjs/throttler`, já instalado): `ThrottlerModule.forRoot` no `AppModule` + guard global. **Chave por tenant quando autenticado, por IP quando não** (guard custom `getTracker = getTenantId() ?? req.ip`) — porque o tráfego do `/nina` vem do **IP único do n8n** (per-IP bloquearia legítimo). Limite default moderado (ex. 120/min); **`/auth/login` estrito** (ex. 5/min, por IP).

## 3. Critérios de aceite
- [ ] `fetchComTimeout` aborta no timeout (não trava) e sempre limpa o timer; retry só em 429/5xx; sem timeout em chamada rápida.
- [ ] `OpenRouterAdapter`/`ElevenLabsAdapter` usam timeout; falha externa → `ServiceUnavailableException` (não pendura a request). Specs existentes do adapter seguem verdes.
- [ ] `ThrottlerGuard` ativo globalmente; chave = tenant (autenticado) ou IP (anônimo); `/auth/login` com limite estrito; `/nina/*` limitado por tenant (não bloqueia o IP do n8n).
- [ ] `tsc` verde; `yarn test` verde; sem `any` público.

## 4. Harness
- **Unit `fetch-timeout.util`:** resolve normal; timeout → rejeita/abort (mock de fetch lento via `AbortSignal`); retry em 503 (e não em 400). Determinístico (timers fakes ou timeout pequeno).
- **Throttler:** teste de presença/config (guard registrado, limite do login estrito, `getTracker` por tenant). Não precisa simular carga real.
- Resultado em `.ai/HARNESS_RESULTS/SPRINT-10-spec-008-hardening.md`.

## 5. Fora de escopo (coordenado depois)
- **n8n (#3 onError):** timeout/retry + ramo `onError` + Error Workflow nos httpRequest do brain/digest/alertas (via MCP; publish do Tiago).
- **#1 webhook HMAC** (nó de validação + config Evolution) e **#2 backup** (script pg_dump + ligar no EasyPanel) — Onda 1b, coordenados.
- Riscos → `PREMORTEM-spec-008-hardening.md`.
