# SPEC-013 — Idempotência de escrita (webhook reentrega)

> Status: **✅ backend pronto + auditado (SPRINT-15, 8-agentes) · n8n draft via MCP · pendente redeploy + publish do Tiago** · 2026-06-25
> Fecha o achado **#9** do premortem (MÉDIO): reentrega do Evolution (reconexão/history-sync) duplica
> ação de escrita (movimentação/conta/aporte). Dedup por `message_id` (`key.id`) na borda + chave de
> idempotência no backend nas mutações.

## 1. Objetivo
Uma reentrega do mesmo `key.id` **não** duplica lançamento. Duas camadas: (a) **n8n** descarta repetição
no filtro (ring buffer); (b) **backend** dedup por `idempotencyKey` único por tenant nas mutações
financeiras (defesa real, mesmo se a borda falhar).

## 2. Slices disjuntos (1 agente cada — NÃO tocar arquivo de outro slice)
### 13A — Schema + migration
- **Donos:** `prisma/schema.prisma`, novo dir `prisma/migrations/<timestamp>_spec_013_idempotencia/migration.sql`.
- Adicionar a **`Conta`** e ao model de **aporte de meta** (ler o schema p/ achar — provável `AporteMeta`
  ou similar usado por `FinancasService.aportar`): campo `idempotencyKey String? @map("idempotency_key")`
  + `@@unique([tenantId, idempotencyKey])`. Nullable → linhas antigas (null) não conflitam (PG trata
  NULLs como distintos). Migration SQL hand-written espelhando as migrations existentes (ALTER TABLE ADD
  COLUMN + CREATE UNIQUE INDEX). **Não** rodar prisma/migrate (o integrador roda generate/deploy).

### 13B — Dedup no financeiro
- **Donos:** `src/modules/financeiro/financeiro.service.ts`, `financeiro.repository.ts`,
  `dto/registrar-movimentacao.dto.ts`, `dto/create-conta.dto.ts`, `financeiro.service.spec.ts`.
- DTOs ganham `idempotencyKey?: string` (`@IsOptional() @IsString()`). `create` e `registrarMovimentacao`
  passam `idempotencyKey` ao repo. Repo: ao criar, se `idempotencyKey` setado e já existir (P2002 ou
  pré-check `findFirst({tenantId, idempotencyKey})`) → **devolve o registro existente** (no-op, sem dobrar).
  Sem `idempotencyKey` → comportamento atual. **Contrato:** campo `idempotencyKey` (snake `idempotency_key`).
- Spec: 2x mesma `idempotencyKey` → 1 registro; sem chave → cria normal.
- ⚠️ Esse arquivo foi mexido na SPEC-011 (tz) — **preservar** a lógica tz (`ancorarDataOnly`, `bordas`).

### 13C — Dedup no financas (aportar)
- **Donos:** `src/modules/financas/financas.service.ts`, `financas.repository.ts`, o dto de aporte,
  `financas.service.spec.ts`.
- `aportar` aceita `idempotencyKey?`; ao gravar o aporte (increment + registro), se a chave já existir →
  no-op (devolve estado atual, **sem** incrementar de novo). Mesmo contrato de campo.
- Spec: 2x mesma chave → incrementa 1x só.

### 13D — n8n (design + doc; integrador aplica via MCP)
- **Dono:** `n8n/workflows/nina-idempotencia.md` (novo).
- Projetar: (1) dedup no `Filtro de Gatilho` do brain (`Dqm3pJo2MNHcRZ1R`) — ring buffer `Set`/array de
  `key.id` vistos no `staticData` (cap ~50, TTL), marcar visto **antes** de rotear, `return []` em
  repetição; (2) os nós HTTP de escrita (`API: registrar movimentacao`, `API: criar conta`, `Aportar meta`)
  passam `idempotencyKey = key.id` no body. Entregar o **jsCode exato** do filtro com a dedup e a lista de
  nós/campos a alterar. **NÃO** editar o workflow (o integrador aplica via MCP; Tiago publica).

## 3. Critérios de aceite
- [ ] 2x a mesma `idempotencyKey` em `registrarMovimentacao`/`create`/`aportar` → **1** efeito (sem dobra).
- [ ] Sem `idempotencyKey` → comportamento atual intacto (não-regressão; saldo sem dobra ADR-007).
- [ ] `@@unique([tenantId, idempotencyKey])` (nulls não conflitam). Migration aplicável.
- [ ] n8n: design do ring-buffer + passagem de `key.id` documentado (jsCode pronto).
- [ ] `tsc` verde; specs passando; tenant-scope intacto.

## 4. Handoff (Tiago)
- Redeploy da API (migration roda no entrypoint). n8n: aplicar o draft (Claude via MCP) + **publicar**.
