# HANDOFF — evo-sec (Nina)   (2026-06-16 · De: Claude → Para: próxima sessão)

## Onde paramos
**Roadmap das 4 sprints CONCLUÍDO e testado (E2E + Playwright).** 10 PRs mergeados na `main` (`EvotechBrazil/evo-sec`).
- Backend NestJS: GTD (recados/tarefas/lembretes), Agenda (disponibilidade + recorrência), Financeiro (contas/fluxo/vencimentos), Finanças/coach (metas/aportes/investimentos/evolução), Custo (usos-llm). Auth dupla (JWT + x-service-token), multi-tenant, migração+seed, RLS camada 2 migrada.
- Dashboard Next.js: 6 telas (Início, Agenda, Aguardando, Financeiro, Pé de meia, Custo) + login.
- n8n: prompts da Nina + filtro de gatilho + multimodal (artefatos/docs).
- Governança: `.ai/` (STATE, MASTERPLAN, SPEC-001, ADR-001..006, PREMORTEMs, HARNESS por sprint).

## O que falta (próximos passos — em ordem)
1. **Workflow n8n vivo** na instância: montar via n8n-mcp a partir de `n8n/prompts/*` + `n8n/workflows/nina-gatilho-filter.code.js` + `nina-multimodal.md`. Requer credenciais OpenRouter + Evolution + variáveis (TENANT_ID, OWN_NUMBER=5543999864409, GATILHO_CODIGO, SERVICE_TOKEN, API_BASE).
2. **RLS camada 2** (enforcement total): role não-owner + SECURITY DEFINER no login (ver `.ai/ADR/ADR-006`).
3. **Telas com gráficos** (recharts/Tremor) em Financeiro/Custo; CRON (briefing/vencimentos/aporte) no n8n.
4. **Pré-deploy**: rodar checklist GO/NO-GO de `.ai/PREMORTEMS/PREMORTEM-producao.md`.

## Como retomar o ambiente local (amanhã)
```bash
# 1. Postgres (Docker) — se Docker Desktop não estiver aberto, abrir antes
docker start evosec-pg

# 2. Backend (porta 3001) — matar a porta antes evita servir build antigo
cd e:/Projetos/Sec/backend && yarn start:dev

# 3. Frontend (porta 3000)
cd e:/Projetos/Sec/frontend && yarn dev
# Login: tiago@crossfitarapongas.com.br  /  Nina@2026#troque
```

## Comando de retorno (cole no início da próxima sessão)
> "Retomar o projeto evo-sec (Nina). Leia `.ai/HANDOFF.md`, `.ai/STATE.md` e o CLAUDE.md. Suba o ambiente (docker start evosec-pg + backend + frontend) e continue pelos próximos passos do HANDOFF — começando pelo workflow n8n vivo na instância."
