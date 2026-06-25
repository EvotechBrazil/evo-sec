# SPEC-015 — Login determinístico + middleware valida tenant (Onda 3, Fase 1)

> Status: **✅ backend + front pronto + auditado (SPRINT-16) · pendente redeploy (API+front) do Tiago** · 2026-06-25
> Fecha #11 (login resolve user por email SEM tenant → não-determinístico no 2º tenant) e #12
> (SERVICE_TOKEN master-key: middleware confia em qualquer `x-tenant-id` sem validar existência/ativo).

## 1. Objetivo
Tornar o login **determinístico** e o middleware **resistente a `x-tenant-id` forjado/inativo**, antes
do 2º tenant. Sem mudar a UX do login (decisão: email globalmente único).

## 2. Decisões
- **#11:** `User.email` passa a ser **globalmente `@unique`** (hoje `@@unique([tenantId, email])`).
  1 conta por email → `findFirst({email})` do login fica determinístico. Tradeoff: o **mesmo email
  não pode existir em 2 tenants** (aceitável p/ "1 dono por tenant"; alternativa futura = login com
  slug/subdomínio). Migração segura em mono-tenant (sem emails duplicados hoje).
- **#12:** o `AuthMiddleware`, no caminho do **service-token**, valida que o `x-tenant-id` **existe e
  está ativo** (`deletedAt IS NULL`) antes de abrir o contexto; senão → 401. Fecha o "token aceita
  qualquer tenant".

## 3. Slices disjuntos (1 agente cada)
### 15A — Email global-unique (#11)
- **Donos:** `prisma/schema.prisma` (User: `email String @unique`, remover `@@unique([tenantId, email])`),
  nova migration `prisma/migrations/<ts>_spec_015_email_unique/migration.sql` (DROP INDEX composto +
  CREATE UNIQUE INDEX em `email`), `src/modules/auth/auth.service.ts` (comentário: agora determinístico)
  + `auth.service.spec.ts` (login acha o user certo; não-regressão).
- ⚠️ NÃO rodar prisma/migrate (o integrador roda generate). Espelhar o estilo das migrations.

### 15B — Middleware valida tenant (#12)
- **Donos:** `src/common/auth/auth.middleware.ts` (+ `.spec.ts` se aplicável).
- No ramo service-token (`x-service-token` válido), antes de `runWithTenant`, fazer
  `prisma.tenant.findFirst({ where: { id: xTenantId, deletedAt: null }, select: { id: true } })`;
  se não achar → `UnauthorizedException('Tenant inválido ou inativo.')`. NÃO mexer no caminho JWT
  (o tenantId vem assinado no token). Ler o middleware atual antes; injetar PrismaService se preciso.

## 4. Critérios de aceite
- [ ] `User.email` globalmente único (schema + migration aplicável); login determinístico.
- [ ] Middleware rejeita `x-service-token` válido + `x-tenant-id` inexistente/soft-deletado (401).
- [ ] Caminho JWT inalterado; não-regressão (auth atual passa).
- [ ] `tsc` verde; specs passando.

## 5. Handoff (Tiago)
- Redeploy da API (migration roda no entrypoint). Sem mudança de UX.
- **Alívio imediato do logout:** subir `JWT_ACCESS_TTL` (ex.: `12h`) no env + restart, até o deploy do refresh.

## 6. Adendo — `/auth/refresh` (#18: app desloga sozinho após ~15min)
Causa: access token `15m` + refresh token de 7d **é emitido mas nunca usado** (sem rota `/auth/refresh`;
o front descarta o refresh e desloga em qualquer 401). Fix: renovar o access silenciosamente.

### 15A (expandido) — auth backend: email-unique **+ /auth/refresh**
- Além do email-unique: adicionar `POST /auth/refresh` no `auth.controller` + método no `auth.service`
  (`refresh(refreshToken)`): `jwt.verifyAsync(refreshToken, { secret: jwtRefreshSecret })` → extrai
  `sub`/`tenantId` → reemite **novo par** (access+refresh, rotação) via `issueTokens`. Inválido/expirado
  → `UnauthorizedException`. DTO `refresh.dto.ts` (`@IsJWT()`/`@IsString() refreshToken`). Spec: refresh
  válido → novo par; inválido → 401. (Denylist/jti = follow-up; aqui é rotação simples sem revogação.)

### 15C (novo) — frontend: renova no 401 em vez de deslogar
- **Donos:** `frontend/src/lib/api.ts`, `frontend/src/lib/auth.ts`.
- `auth.ts`: guardar/ler também o **refreshToken** (setToken passa a guardar os dois; getRefresh()).
- `login()` (api.ts): guardar **os dois** tokens (hoje só o access).
- Interceptor de resposta: no **401 com cara de token**, se houver refreshToken e ainda não tentou,
  chamar `POST /auth/refresh` UMA vez → sucesso: atualiza os dois tokens + **refaz o request original**;
  falha: `clearToken()` + redirect `/login` (comportamento atual). Flag p/ evitar loop; tratar 401 do
  próprio `/auth/refresh` como logout. Não deslogar mais por simples expiração do access.

### Critérios (refresh)
- [ ] `POST /auth/refresh` reemite par a partir de um refresh válido; 401 se inválido/expirado.
- [ ] Front renova no 401 e **refaz** o request (sem deslogar); só desloga se o refresh falhar.
- [ ] Sem loop de refresh; `/auth/refresh` 401 → logout.
