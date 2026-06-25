# SPEC-011 — Timezone-awareness do módulo financeiro

> Status: **✅ backend pronto + auditado (SPRINT-14) · pendente redeploy do Tiago (só lógica, sem migração)** · 2026-06-25
> Fecha o achado **#8** do `PREMORTEM-sistema-2026-06-24.md` (MÉDIO): o financeiro **não é tz-aware**
> — bordas de mês/janela calculadas no fuso do processo (UTC no container) e datas date-only viram
> meia-noite UTC (off-by-one). Assimétrico: resumo/digest JÁ são tz-aware via `format.util`.

## 1. Objetivo
Padronizar TODAS as bordas de período e datas do financeiro no **fuso do tenant** (`Tenant.timezone`),
reusando os helpers tz-aware existentes. Corrige a atribuição de mês no painel (Entrou/Saiu/Saldo) e
em `consultar_saldo`, a janela de vencimentos, e o off-by-one de "vence dia 30 → 29" na **origem**.

## 2. Causa-raiz (verificada)
- `financeiro.service.resumo`/`fluxoCaixa`: `inicio = new Date(fim.getFullYear(), fim.getMonth(), 1)`
  → 1º do mês no fuso do processo (UTC), não do tenant. Quitações entre 00:00–03:00 UTC do dia 1
  caem no mês errado.
- `vencimentos(dias)`: `ate = new Date(Date.now() + dias*86_400_000)` → não ancora no fim do dia local.
- `create`/`registrarMovimentacao`: `new Date(dto.vencimento|data)` com string **date-only**
  (`YYYY-MM-DD`) → meia-noite UTC → exibido -1 dia no fuso BR.
- O service **não lê** `tenant.timezone` e **não pode** injetar `ResumoRepository` (ciclo de módulo).

## 3. Decisões de design
- **`FinanceiroRepository.tenantTimezone(): Promise<string>`** (lê `tenant.timezone`, tenant-scoped,
  default `America/Sao_Paulo`) — evita o ciclo com ResumoModule. O service chama antes de calcular bordas.
- **Helpers novos em `format.util`** (já é o lar dos helpers tz-aware): `limitesDoMes(now, tz)`
  (espelha `limitesDoDia`) e `ancorarDataOnly(iso, tz)` (date-only → **meio-dia local** do tenant;
  meio-dia evita off-by-one nos dois sentidos; ISO com hora/offset passa direto).
- **Convenção date-only:** normalizar `YYYY-MM-DD` → meio-dia local **antes de persistir** (`vencimento`,
  `data`). `marcarQuitada` (`pagoEm: new Date()`) **fica** — é instante real correto; o display via
  `fmtData` já é tz-aware (o re-carimbo é o #17, fora de escopo).
- **Bordas explícitas** (`inicioIso`/`fimIso` em resumo/fluxo): date-only → início/fim do **dia local**
  (`limitesDoDia` sobre a data ancorada); ISO com hora → usado como veio.
- BR é UTC-3 fixo (sem DST) → os helpers usam `partsInTz`/`tzOffsetMs` (genéricos por tz).

## 4. Escopo (arquivos)
- `modules/resumo/format.util.ts` — `limitesDoMes` + `ancorarDataOnly` (exportados; reusam
  `partsInTz`/`tzOffsetMs` internos). **(+ specs)**
- `modules/financeiro/financeiro.repository.ts` — `tenantTimezone()`.
- `modules/financeiro/financeiro.service.ts` — `resumo`/`fluxoCaixa` (mês default via `limitesDoMes`;
  bordas explícitas ancoradas), `vencimentos` (fim do dia local + N), `create`/`registrarMovimentacao`
  (ancora date-only). Lê tz via `repo.tenantTimezone()`.
- `modules/financeiro/financeiro.service.spec.ts` — mock `tenantTimezone`; testes de off-by-one/borda.

> **Sem migração** (só lógica). Frontend `toLocaleDateString` + datas da Nina = follow-up (não-verificado
> aqui; o off-by-one da **origem** já é resolvido normalizando na persistência).

## 5. Critérios de aceite (verificáveis)
- [ ] `resumo()`/`fluxoCaixa()` sem params: `inicio` = 1º do mês **no fuso do tenant** (não UTC).
  Teste: tenant SP, "agora" = 2026-06-01T01:00:00Z (= 31/05 22h SP) → mês = **maio**, não junho.
- [ ] `vencimentos(dias)`: janela = até o **fim do dia local** daqui a N dias (não `now + N*24h` cru).
- [ ] `create`/`registrarMovimentacao` com `vencimento`/`data` = `"2026-06-30"` → persistido como
  **meio-dia local** → `fmtData(...,tz)` exibe **30/06** (não 29/06).
- [ ] `inicioIso`/`fimIso` date-only → início/fim do **dia local** correspondente.
- [ ] `tenantTimezone()` tenant-scoped (filtra `tenantId`; default SP se ausente).
- [ ] Não-regressão: saldo sem dobra (ADR-007) intacto; testes existentes verdes.
- [ ] `tsc` verde; testes novos passando.

## 6. Harness
- Unit: `limitesDoMes` (borda de mês no fuso; dez→jan), `ancorarDataOnly` (date-only→meio-dia local;
  ISO passa direto), `financeiro.service` (mês default tz; off-by-one de vencimento; janela de
  vencimentos; saldo sem dobra intacto; `tenantTimezone` mockado).
- 2 auditores (não-regressão/tenant + QA dos critérios).
- Resultado em `.ai/HARNESS_RESULTS/SPRINT-14-spec-011-tz-financeiro.md`.

## 7. Handoff (Tiago)
- **Redeploy da API** (só lógica, sem migração). **Dado legado:** contas gravadas antes do fix seguem
  em UTC (vencimento date-only meia-noite UTC) → podem exibir -1 dia até serem regravadas; novas contas
  nascem certas.

## 8. Fora de escopo (registrado)
- Frontend `toLocaleDateString` sem tz + datas de exibição da Nina (#8 parte front) — follow-up.
- Re-carimbo de `pagoEm` em conta já paga (#17). Concorrência/replay financeiro (#17).
