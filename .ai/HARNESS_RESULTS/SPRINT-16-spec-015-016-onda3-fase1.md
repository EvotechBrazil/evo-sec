# SPRINT-16 — Onda 3 Fase 1: SPEC-015 (auth tenant-safe + refresh) + SPEC-016 (multi-tenant n8n)

> Fase 1 da Onda 3 (multi-tenant) via **5 agentes paralelos** (arquivos disjuntos). Fecha #11 (login),
> #12 (middleware), #18 (refresh/logout) e prepara #5 (n8n multi-tenant). **RLS (#4) = Fase 2** (à parte,
> com gate de PG real). Onda 3 escolhida **faseada** (correctness primeiro, RLS depois).

## Escopo entregue
**SPEC-015:**
- **#11 login determinístico:** `User.email` globalmente `@unique` (migration `20260625130000`); login
  `findFirst({email})` deixa de ser ambíguo no 2º tenant. Tradeoff documentado: mesmo email não pode
  existir em 2 tenants (modelo "1 dono/tenant"); login com slug = alternativa futura.
- **#12 middleware:** service-token + `x-tenant-id` → valida tenant existe+ativo (senão 401, fecha o
  master-key); service-token SEM `x-tenant-id` → passa sem contexto (habilita o bootstrap `/tenants/*`).
- **#18 /auth/refresh (resolve o "desloga sozinho"):** o access (15min) expirava e o refresh (7d) era
  emitido mas nunca usado → o front deslogava no 401. Agora `POST /auth/refresh` (verify c/ refresh
  secret → reemite par, rotação; excluído do AuthMiddleware) + front **renova e refaz o request**
  (guard de loop + dedup de concorrência; só desloga se o refresh falhar).

**SPEC-016:**
- `GET /tenants/resolver?numero=` (número→`{tenantId,timezone,nome}`, tolera 9º dígito BR) + `GET
  /tenants/ativos` — **não tenant-scoped** (é o lookup que DESCOBRE o tenant; prisma direto, só dados
  não-sensíveis). n8n: **design** (`nina-multitenant.md`) p/ brain resolver tenant dinâmico + crons
  iterarem tenants ativos — **NÃO aplicado** (depende do redeploy; aplica-se em draft depois).

## Harness
- ✅ `yarn build` (tsc) verde; `yarn test` **184 testes** (26 suites; +19 da Fase 1). Frontend `tsc`
  limpo (fora de cache `.next/mockups` stale pré-existente). Seed type-checado à parte (era ponto cego).
- ⚠️ `yarn lint` não-executável (eslint ausente — gap pré-existente).

## Auditores (2) — ambos **APROVADO COM RESSALVAS**
- **#015 (auth/tenant-safety):** **achou 1 BUG ALTA** — `seed.ts:61` usava `where:{tenantId_email}` (removido
  pela migration) → quebraria o seed no deploy; o `tsc` do build não pega (seed roda via ts-node, fora do
  build). **Corrigido** p/ `where:{email}`. Demais: refresh OK (verify c/ refresh secret, rotação, 401);
  middleware OK (afrouxamento p/ bootstrap aceitável); front-refresh robusto (sem loop, concorrência coalescida).
- **#016 (multi-tenant):** **APROVADO** — zero vazamento cross-tenant (testou colisão DDD/9º dígito);
  endpoints só expõem `id/nome/timezone/numero`; design n8n com regra de ouro (cada iteração = tenantId+numero
  do MESMO tenant), compat mono-tenant.

## Ressalvas registradas (não-bloqueantes)
- Soft-delete + email global-unique: não reusa email de user soft-deletado (índice total; parcial criaria
  drift c/ o `@unique` do Prisma). Aceito v1.
- `/auth/refresh` sem denylist/jti (rotação sem reuse-detection) — follow-up #18.
- `TenantsRepository.listarAtivos()` (sem filtro) = dead code (a versão usada filtra número) — limpar depois.
- Throttler por IP nas rotas `/tenants/*` (n8n compartilha balde) — capacidade futura multi-tenant.

## Handoff (Tiago)
- **Alívio do logout AGORA:** subir `JWT_ACCESS_TTL` (ex.: `12h`) no env + restart, até o deploy do refresh.
- **Redeploy API + frontend** (auth refresh precisa dos dois juntos; migration roda no entrypoint).
- **n8n:** aplicar (Claude via MCP) o design multi-tenant **após** o redeploy + **publicar**. Doc `nina-multitenant.md`.

## Próximo — Onda 3 Fase 2 (#4 RLS camada 2, ADR-006)
Prisma Extension `SET LOCAL app.current_tenant` + role `evosec_app` + FORCE RLS + login SECURITY DEFINER +
**teste cross-tenant em PG real** (gate) + cutover coordenado do DATABASE_URL.
