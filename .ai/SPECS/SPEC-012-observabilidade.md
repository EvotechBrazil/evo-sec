# SPEC-012 — Observabilidade + telemetria de custo LLM

> Status: **✅ backend pronto + auditado (SPRINT-15, 8-agentes) · pendente redeploy do Tiago** · 2026-06-25
> Fecha o núcleo do achado **#14** do premortem (MÉDIO): zero observabilidade + `UsoLlm` nunca
> gravado (painel de custo ilusório/zero) + `/health` estático (uptime mente com DB caído).

## 1. Objetivo
Dar visibilidade real: (a) gravar `UsoLlm` após cada chamada LLM (custo deixa de ser zero);
(b) `/health/ready` que pinga o DB (503 se cair); (c) handlers globais de crash; (d) alerta de
custo diário (envelope p/ cron n8n). Sentry fica como follow-up (precisa de DSN).

## 2. Slices disjuntos (1 agente cada — NÃO tocar arquivo de outro slice)
### 14A — Health readiness
- **Donos:** `src/health.controller.ts`, `src/prisma/prisma.service.ts`, `src/health.controller.spec.ts` (novo).
- `PrismaService.ping(): Promise<void>` → `await this.$queryRaw\`SELECT 1\``.
- `GET /health/ready` → chama ping; sucesso `{status:'ready'}`; falha → `ServiceUnavailableException` (503).
  `GET /health` (liveness) fica estático. `@SkipThrottle()` mantido.

### 14B — Crash handlers globais
- **Donos:** `src/main.ts`.
- Adicionar, no bootstrap (antes/depois do listen), `process.on('unhandledRejection', ...)` e
  `process.on('uncaughtException', ...)` usando `Logger` do Nest (não `console`). `uncaughtException`
  loga e **não** mata o processo silenciosamente (logar; opcional `process.exit(1)` documentado).
  Hook comentado p/ Sentry futuro (sem adicionar dep).

### 14C — Gravar UsoLlm de verdade
- **Donos:** `src/modules/nina/openrouter.adapter.ts` (+ `.spec.ts`), `src/modules/nina/nina.service.ts`
  (+ `.spec.ts`), `src/modules/nina/nina.module.ts`, `src/modules/custo/custo.module.ts`.
- `OpenRouterAdapter.intent` passa a parsear `usage` + custo da resposta e devolver no `IntentResult`:
  estender `IntentResult` com `usage?: { tokensIn: number; tokensOut: number } | null` e
  `custoMicroUsd?: number | null` (cost vem em USD float em `data.usage.cost`/`data.cost` →
  `Math.round(cost * 1_000_000)`; se ausente, null). **Não** quebrar callers (campos opcionais).
- `custo.module.ts`: adicionar `exports: [CustoService]`. **(contrato p/ 14D e 14C)**
- `nina.module.ts`: `imports: [..., CustoModule]`.
- `nina.service.ts`: injetar `CustoService`; após `this.llm.intent(...)`, se houver `usage`, chamar
  `this.custo.registrar({ tarefa: ModeloTarefa.CLASSIFICAR, modelo: <env model>, tokensIn, tokensOut,
  custoMicroUsd })` em **best-effort** (`.catch(() => undefined)` — telemetria não derruba o fluxo).
  O modelo: ler do mesmo lugar que o adapter (expor um getter `modelo` no adapter ou usar a env).
- Specs: adapter parseia usage; nina.service registra (mock CustoService) e best-effort não quebra.

### 14D — Alerta de custo (envelope p/ cron)
- **Donos:** `src/modules/resumo/alertas/alerta-custo.service.ts` (novo + `.spec.ts`),
  `src/modules/resumo/alertas/alertas.controller.ts` (+ rota `@Get('custo')`),
  `src/modules/resumo/resumo.module.ts` (registrar service + `imports: CustoModule`),
  `n8n/workflows/nina-custo.md` (doc).
- `AlertaCustoService.gerar(dias=1)`: reusa `CustoService.resumo(dias)` + `ResumoRepository.tenantInfo`
  (numero) + `flagAtiva('alerta_custo_ativo')`; teto via Config `custo_teto_micro_usd` (default ex.:
  `5_000_000` = US$5/dia). Envelope `{ativo, numero, temAlerta, custoMicroUsd, tetoMicroUsd, dia, texto}`
  (`temAlerta = custo > teto`). **Contrato:** consome `CustoService` (exportado por 14C).
- **Não** tocar nina/custo/health/main.

## 3. Critérios de aceite
- [ ] `GET /health/ready` 200 com DB ok; 503 se `ping` falhar.
- [ ] Após `nina.processar`, um `UsoLlm` é gravado (tokens + custoMicroUsd) — telemetria deixa de ser zero.
- [ ] Falha ao gravar `UsoLlm` **não** quebra a resposta da Nina (best-effort).
- [ ] `unhandledRejection`/`uncaughtException` logados (não silenciosos).
- [ ] `GET /resumo/custo` devolve envelope com `temAlerta` quando custo do dia > teto.
- [ ] `tsc` verde; specs novos passando; tenant-scope intacto.

## 4. Handoff (Tiago)
- Redeploy da API. Cron n8n de custo (doc `nina-custo.md`) = opcional. Sentry (`@sentry/node` + DSN) = follow-up.
