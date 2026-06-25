# SPRINT-14 — SPEC-011: timezone-awareness do financeiro

> Fecha o achado **#8** do `PREMORTEM-sistema-2026-06-24.md` (MÉDIO): financeiro não era tz-aware.

## Escopo entregue
- **`format.util`**: `limitesDoMes(now,tz)` (mês local, rola dez→jan) + `ancorarDataOnly(iso,tz)`
  (date-only → **meio-dia local**; ISO com hora passa direto).
- **`FinanceiroRepository.tenantTimezone()`** — lê `tenant.timezone` (tenant-scoped, default SP).
  **Não** injeta ResumoRepository (evita ciclo: ResumoModule já importa FinanceiroModule).
- **`FinanceiroService`** tz-aware: `resumo`/`fluxoCaixa` (mês default via `limitesDoMes`; bordas
  explícitas date-only ancoradas ao dia local via `bordas`/`bordaDia`), `vencimentos` (fim do dia
  local +N), `create`/`registrarMovimentacao` (ancora `vencimento`/`data` date-only).
- `marcarQuitada` (`pagoEm: new Date()`) **mantido** — instante real correto; display já tz-aware.

## Harness
- ✅ `yarn build` (nest/tsc): **verde**.
- ✅ `yarn test`: **132 testes** (19 suites) — +13 da SPEC-011 (format.util +5: limitesDoMes/ancorar;
  financeiro.service +5: mês default tz, bordas date-only, vencimentos, off-by-one create/movimentação;
  financeiro.repository +3: tenantTimezone scope/default). Não-regressão: "saldo sem dobra" (ADR-007) verde.
- ⚠️ `yarn lint`: não-executável (eslint ausente no repo — gap pré-existente).

## Auditores (2, papéis separados)
- **Tenant/não-regressão/arquitetura:** **APROVADO**. Sem ciclo de módulo (`format.util` é puro, não
  importa financeiro); `tenantTimezone` tenant-scoped; ADR-007 intacto; callers async OK
  (controller/nina/alertas já consumiam Promise). MENOR (não-bloqueante): `tenantTimezone()` é 1
  round-trip serial antes das somas — aceito.
- **QA dos critérios:** **APROVADO COM RESSALVAS**. 7/7 critérios ATENDE; **matemática de fuso (UTC-3)
  recalculada à mão** confere com os testes; bordas extras (NY/DST, Índia +5:30, fevereiro, virada de
  ano) corretas por construção (offset derivado via `Intl` por-instante, não hardcode). Ressalva
  [BAIXO-1] (faltava teste de `tenantTimezone`) **corrigida** (`financeiro.repository.spec.ts`).

## Critério de aceite-chave (verificado)
- "agora" = `2026-06-01T01:00:00Z` (= 31/05 22h SP) → `resumo()` usa **maio** (`inicio=2026-05-01T03:00Z`),
  não junho. (`financeiro.service.spec.ts` + `format.util.spec.ts`.)
- `vencimento="2026-06-30"` → persistido `2026-06-30T15:00:00Z` (meio-dia SP) → `fmtData`=**30/06** (não 29).

## Handoff (Tiago)
- **Redeploy da API** (só lógica, **sem migração**).
- **Dado legado:** contas gravadas antes do fix (date-only à meia-noite UTC) podem exibir -1 dia até
  serem regravadas; **novas nascem certas**. (Mesma nota da SPEC-007 no STATE.)

## Fora de escopo (registrado)
- Frontend `toLocaleDateString` sem tz + datas de exibição da Nina (#8 parte front) — follow-up.
- Re-carimbo de `pagoEm` (#17). O off-by-one da **origem** (persistência) está resolvido.
