# HARNESS — SPRINT 10 / SPEC-008 (Onda 1: hardening backend)

> 2026-06-24 · Scrum master: Claude · Branch `feat/spec-008-hardening-resiliencia-ratelimit`

## Escopo entregue (2 release-blockers do premortem, parte backend)
- **#3 Resiliência:** `common/http/fetch-timeout.util.ts` — `fetchComTimeout` (AbortController + `clearTimeout` no `finally`) + `fetchComRetry` (retry só 429/502/503/504). `OpenRouterAdapter.intent` e `ElevenLabsAdapter.tts` agora com timeout (env `LLM_TIMEOUT_MS`=15s, `TTS_TIMEOUT_MS`=12s) → timeout/erro vira `ServiceUnavailableException` (não pendura ~5min; orb cai no TTS do navegador, `/nina/mensagem` responde 503).
- **#7 Rate-limit:** `@nestjs/throttler` global; `TenantThrottlerGuard` com `getTracker = getTenantId() ?? req.ip` (chave por **tenant** quando autenticado, IP quando anônimo) → não estrangula o IP único do n8n; `/auth/login` `@Throttle` 5/min; health `@SkipThrottle`.

## Provas
- **`tsc --noEmit`** verde · **`yarn test` 92/92** (8 novos: 6 fetch-timeout + 2 throttler-guard; specs do openrouter seguem verdes pois `fetchComTimeout` chama o `global.fetch`).
- **Auditoria (2 agentes):**
  - **Correção/não-regressão:** APROVADO — timeout/retry corretos, adapters→503, throttler bem registrado, login estrito, health isento, sem regressão.
  - **Adversarial:** APROVADO (após fix) — 🔴 **provou EMPIRICAMENTE** o ponto crítico: subiu um `INestApplication` real (AuthMiddleware + `TenantThrottlerGuard`), 2 tenants no MESMO IP (127.0.0.1) → **baldes separados** (tenant-A 429 na 4ª, tenant-B 200) → o ALS do tenant propaga até o guard, o IP do n8n **não** vira gargalo. **[MAIOR] corrigido:** timeouts hardcoded → **env-configuráveis** (LLM 15s, TTS 12s). [MENOR aceitos]: falta teste de integração middleware→guard versionado; documentar premissa "gemini < 15s".

## Pendente
- **Tiago:** deploy da API.
- **Onda 1b (coordenada — fecha o resto dos release-blockers):**
  - **#3-n8n:** `options.timeout` + `retryOnFail` + ramo `onError` (Evolution sendText "tive um problema, pode repetir?") nos httpRequest do brain/digest/alertas + Error Workflow (dead-letter) — via MCP, publish do Tiago.
  - **#1 webhook HMAC** (nó de validação no 1º passo + Evolution mandando o header `EVOLUTION_WEBHOOK_HMAC_SECRET`).
  - **#2 backup** (script `pg_dump` diário + off-site; ligar no EasyPanel; TESTAR restore).
- **Ondas 2–3:** resto do `.ai/PREMORTEMS/PREMORTEM-sistema-2026-06-24.md` (lembrete recorrente, tz financeiro, idempotência, observabilidade, RLS camada 2, multi-tenant).
