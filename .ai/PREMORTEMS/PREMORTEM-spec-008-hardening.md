# PREMORTEM — SPEC-008 (hardening: resiliência + rate-limit)

| # | Risco | P×I | Mitigação |
|---|---|---|---|
| 1 | **Timeout curto demais corta resposta legítima** (qwen/gemini com reasoning podem demorar) | **12** | Timeouts generosos (LLM ~12s, TTS ~10s), ajustáveis por env; retry só em 5xx/429 (não em timeout do corpo). Medir contra a latência real (orb ~9s hoje). |
| 2 | **Rate-limit bloqueia tráfego legítimo do n8n** (IP único) | **16** | `getTracker` por **tenant** quando autenticado (service-token+tenant) → o IP do n8n não é a chave; só anônimo (login) é por IP. Limite default folgado. |
| 3 | **Throttler global quebra rotas internas/health** | 9 | `@SkipThrottle` em health/rotas de sistema se houver; limite default alto o suficiente p/ uso normal. |
| 4 | **Timer não limpo vaza handle** (test/prod) | 6 | `finally { clearTimeout(t) }` sempre; teste cobrindo. |
| 5 | **Quebrar specs existentes do adapter** (mock de fetch) | 8 | `fetchComTimeout` chama o `global.fetch` por baixo → os mocks de `global.fetch` seguem valendo; agente confirma os specs verdes. |
| 6 | **AbortController/fetch indisponível** (versão Node) | 4 | Node 18+ tem `fetch`/`AbortController` nativos (o projeto já usa `fetch` global). |

## Gate de saída
`tsc` verde · `yarn test` verde (util + adapters) · 2 auditores aprovam · STATE atualizado · deploy (Tiago/token) → validar (orb responde; login limita após N tentativas).
