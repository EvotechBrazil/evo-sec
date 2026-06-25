# SPEC-016 — Resolução de tenant dinâmica (n8n) + crons multi-tenant (Onda 3, Fase 1)

> Status: **✅ endpoints backend pronto + auditado (SPRINT-16) · n8n = design (aplicar pós-redeploy) · pendente redeploy + n8n do Tiago** · 2026-06-25
> Fecha #5: `x-tenant-id`/`TENANT_ID`/`OWN_NUMBER` hardcoded em todos os workflows. No 2º tenant,
> mensagens de qualquer dono viram tenant #1 e digests/alertas entregam dados ao WhatsApp errado (LGPD).

## 1. Objetivo
O brain WhatsApp resolve o **tenant pelo número** (não hardcoded); os crons (digest/alertas/lembretes/
custo) **iteram sobre tenants ativos**. Backend dá os endpoints de resolução/listagem.

## 2. Slices disjuntos (1 agente cada)
### 16A — Endpoints de tenant (backend)
- **Donos:** novo `src/modules/tenants/` (`tenants.module.ts`, `tenants.controller.ts`,
  `tenants.service.ts`, `tenants.repository.ts`, `*.spec.ts`), + registrar em `src/app.module.ts` (imports).
- `GET /tenants/resolver?numero=<digits>` → `{ tenantId, timezone, nome }` do tenant cujo
  `whatsappNumber` casa o número (tolerar 9º dígito BR, como o filtro do n8n). Não acha → 404.
  Auth: service-token (n8n). **Não** é tenant-scoped (é o lookup que DESCOBRE o tenant) — use o
  PrismaService direto filtrando só `deletedAt: null` (documinte que é exceção consciente à camada 1).
- `GET /tenants/ativos` → `[{ tenantId, numero, timezone, nome }]` dos tenants ativos (`deletedAt IS NULL`,
  `whatsappNumber` não-nulo) — p/ os crons iterarem. Auth: service-token.
- Specs: resolver acha por número (com/sem 9º dígito), 404 quando não acha; ativos lista só ativos.
- ⚠️ Como NÃO é tenant-scoped, blindar: só expõe `tenantId/numero/timezone/nome` (nada sensível).

### 16B — n8n: brain dinâmico + crons iterando (design; integrador aplica via MCP)
- **Dono:** `n8n/workflows/nina-multitenant.md` (novo, design + passos).
- Projetar: (1) **brain** (`Dqm3pJo2MNHcRZ1R`): após o filtro resolver `tenantId` chamando
  `GET /tenants/resolver?numero={{numero}}` e usar esse `tenantId` no header `x-tenant-id` dos nós de
  escrita (em vez do literal) — entregar o desenho dos nós/headers a alterar. (2) **crons**
  (digest `rob9zT99...`, alertas `b4gopjjyGKMrCJaP`, lembretes `YTtIdxcNtgtENUgL`, custo): um passo
  `GET /tenants/ativos` → Split/loop → por tenant, chamar o endpoint com o `x-tenant-id` daquele tenant.
  Entregar o desenho (nós + expressões). **NÃO** editar o n8n (o integrador aplica; Tiago publica).
- Compatível com mono-tenant: com 1 tenant ativo, o loop roda 1x (comportamento atual preservado).

## 3. Critérios de aceite
- [ ] `GET /tenants/resolver?numero=` resolve o tenantId pelo `whatsappNumber` (tolerância 9º dígito); 404 se não.
- [ ] `GET /tenants/ativos` lista tenants ativos com número/timezone.
- [ ] Endpoints só expõem dados não-sensíveis; auth service-token; `deletedAt` respeitado.
- [ ] Design n8n (brain dinâmico + crons iterando) documentado, compatível com mono-tenant.
- [ ] `tsc` verde; specs passando.

## 4. Handoff (Tiago)
- Redeploy da API. n8n: aplicar (Claude via MCP) + **publicar** os workflows ajustados.
