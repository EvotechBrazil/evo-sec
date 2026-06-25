# SPRINT-15 — SPEC-012 (observabilidade) + SPEC-013 (idempotência) — 8 agentes paralelos

> Sprint duplo executado com **8 agentes em paralelo (4 por SPEC, arquivos disjuntos)** + integração
> + 2 auditores. Fecha o núcleo dos achados **#14** e **#9** do premortem.

## Método (8 agentes disjuntos)
SPECs definiram contratos exatos + ownership de arquivos disjuntos → 8 agentes escreveram em paralelo
sem conflito (não rodaram git/build/prisma). Integração feita pela Claude: `prisma generate`, wiring,
build, fix de fixtures, aplicação do n8n via MCP.
- **#14:** 14A health/ready · 14B crash handlers · 14C gravar UsoLlm · 14D alerta-custo.
- **#9:** 13A schema+migration · 13B financeiro dedup · 13C financas aportar dedup · 13D n8n design.

## Integração (ajustes da Claude)
- `prisma generate` (schema 13A: `idempotencyKey` em `Conta` + `MetaFinanceira`).
- `financas.controller`: passar `dto.idempotencyKey` ao `aportar` (13C sinalizou — controller fora do slice).
- 3 fixtures de spec (`financeiro.service`/`financeiro.repository`/`alertas-metas`) ganharam
  `idempotencyKey: null` (campo agora obrigatório no tipo Prisma) + `dadosConta` tipado.
- **n8n via MCP** (workflow `Dqm3pJo2MNHcRZ1R`, draft): dedup ring-buffer `key.id` no `Filtro de Gatilho`
  + `idempotencyKey = $('Filtro…').first().json.mediaKey` nos 3 nós de escrita. `node --check` no jsCode
  salvo OK; `versionId ≠ activeVersionId` (Tiago publica).

## Harness
- ✅ `yarn build` (tsc): verde.
- ✅ `yarn test`: **165 testes** (23 suites) — +33 dos 8 slices. Não-regressão: tz SPEC-011 + saldo
  sem-dobra (ADR-007) intactos (specs provam).
- ⚠️ `yarn lint`: não-executável (eslint ausente — gap pré-existente).

## Auditores (2, papéis separados) — ambos **APROVADO COM RESSALVAS**
- **#14:** best-effort de telemetria (UsoLlm nunca quebra a Nina, fire-and-forget com `.catch`),
  tenant-scope (ALS preservado sem await), DI/wiring (11º arg + CustoModule export), sem ciclo.
  Ressalva MENOR: **teto de custo é constante `5_000_000` (US$5/dia)** em vez de Config
  `custo_teto_micro_usd` por-tenant (desvio do contrato 14D) → **follow-up** (v1 usa o default).
- **#9:** dedup correto (pré-check `findFirst` tenant-scoped → no-op), migration aplicável,
  tz/saldo preservados. Ressalvas BAIXAS: stamp de idempotência na coluna singular
  `MetaFinanceira.idempotencyKey` (cobre **reentrega imediata** — o caso-alvo do Evolution; um 2º
  aporte sobrescreve o stamp) — sem ledger de aporte é divida registrada; assimetria `deletedAt` no
  pré-check do aportar (lado seguro); `@MaxLength` só no AportarDto.

## Handoff (Tiago)
- **Redeploy da API** (migration `idempotency_key` roda no entrypoint).
- **n8n:** aplicar/publicar o draft do brain (dedup + idempotencyKey). Doc `n8n/workflows/nina-idempotencia.md`.
- **Opcional:** cron n8n de custo (doc `nina-custo.md`); Sentry (`@sentry/node` + DSN) = follow-up.

## Follow-ups registrados
- Teto de custo por-tenant via Config (`custo_teto_micro_usd`). Ledger de aporte dedicado (histórico
  idempotente). `@MaxLength` nos DTOs de conta. Sentry. Validação de `?dias`.
