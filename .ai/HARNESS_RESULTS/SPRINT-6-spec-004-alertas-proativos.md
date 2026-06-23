# HARNESS — SPRINT 6 / SPEC-004 (Alertas proativos) — Backend

> 2026-06-23 · Scrum master: Claude · Branch: `feat/spec-004-alertas-proativos`

## Escopo entregue (Sprint 1 — backend)
3 endpoints de alerta proativo no `ResumoModule`, tenant-scoped, texto pronto p/ WhatsApp, opt-out por Config, flag `temAlerta` (n8n só envia quando há o que avisar):
- `GET /resumo/vencimentos` — contas atrasadas / vencem hoje / próximos 7d (separa A_PAGAR vs A_RECEBER). Opt-out `alerta_vencimentos_ativo`.
- `GET /resumo/aportes` — metas atrasadas + aporte sugerido. **Disclaimer educativo sempre presente** (guardrail do coach). Opt-out `alerta_aportes_ativo`.
- `GET /resumo/follow-ups` — tarefas `AGUARDANDO` com `dataCobranca` vencida (verificação contínua GTD). Opt-out `alerta_aguardando_ativo`.

Reuso (sem reescrita): `FinanceiroService.vencimentos()`, `FinancasService.evolucao()`, `TarefasService.list()`, `ResumoRepository.tenantInfo()/flagAtiva()`, helpers de `format.util`. Wiring: `ResumoModule` ganhou `FinancasModule` + `AlertasController` + 3 services.

## Provas
- **`tsc --noEmit`**: verde (exit 0).
- **`yarn test` (suíte completa)**: **52/52 → 53/53** com o teste de truncamento adicionado. Alertas: **27 testes** (vencimentos 10, metas 10, aguardando 7).
- Cobertura por alerta: categorização/borda-de-dia tz-aware, opt-out (`flagAtiva=false`→`ativo:false`), `temAlerta=false` quando vazio, moeda em centavos (`fmtMoeda`), disclaimer sempre (metas), filtro `dataCobranca<fim` (aguardando), ordenação, e **truncamento ≤2.000 chars** (integração em vencimentos + unit em `format.util.spec.ts`). Datas determinísticas via `dataIso` fixo.

## Auditoria (2 agentes, conforme Scrum)
- **Segurança/Multi-tenant + Standards:** **APROVADO**, zero achados. Confirmado: nenhum acesso direto a Prisma; `numero` vem do `tenantInfo()` do mesmo contexto; sem `any` público; moeda só em centavos; disclaimer inviolável em metas; naming/LOC ok; de-branding ok; DI completo.
- **Harness/QA + caça-bug:** **APROVADO**. 2 menores: (1) `if (faltaCentavos<=0) return 0` é código defensivo inalcançável → mantido (defesa em profundidade); (2) faltava teste de truncamento no contexto do alerta → **fechado** (teste adicionado, 300 contas → `texto.length ≤ 2000`).

## Pendente (Sprint 2 — n8n)
- 3 workflows Schedule no n8n (via MCP): `GET /resumo/<x>` → IF (`ativo && temAlerta && numero`, `typeValidation: loose`) → Evolution sendText. Cadências sugeridas: vencimentos diário 8h; aportes seg 9h; follow-ups dias úteis 8h30.
- **Publish é manual do Tiago** (classificador bloqueia publish via MCP). Doc: `n8n/workflows/nina-alertas.md`.
- **Deploy da API pelo Tiago** → validação E2E em prod (criar conta atrasada/meta atrasada/tarefa aguardando → conferir os 3 GETs + envio no WhatsApp).
