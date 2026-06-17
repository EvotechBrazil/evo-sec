# STATE — evo-sec (Nina)   (atualizado 2026-06-16 por Claude)

## Status atual
**TODAS as sprints (1–4) concluídas e testadas (E2E + Playwright) na `main`** (10 PRs). Backend: GTD + Agenda (com recorrência) + Financeiro + Finanças/coach + Custo, auth dupla, tenant, migração+seed, RLS camada 2 migrada. Dashboard: 6 telas. n8n: prompts + filtro de gatilho + multimodal (docs). Premortem de produção pronto. Pendências para deploy: enable RLS camada 2 (role não-owner, ADR-006), construir o workflow n8n vivo na instância com credenciais (OpenRouter/Evolution), e o GO/NO-GO de produção.

### Histórico
**Sprint 1 MVP** (7 PRs): (1-5) backend NestJS — auth dupla, tenant, CRUD GTD (Recados/Tarefas/Lembretes) + Agenda, migração `init` + seed, **Harness E2E verde** contra Postgres real; (6) n8n — prompts da Nina + filtro de gatilho (isolamento) + guia de setup; (7) dashboard Next.js (login + Início + Agenda + Aguardando, `next build` OK). `gh` autenticado, perms git liberadas, Docker `evosec-pg` rodando.

## Próximas ações (roadmap restante)
- Sprint 2 — Financeiro (gestão): módulo Conta (CRUD, padrão Recados) + fluxo de caixa + CRON vencimentos + tela.
- Sprint 3 — Finanças (coach): Meta + Investimento + tela de evolução + CRON aporte/alerta.
- Multimodal: adapters de transcrição (áudio) e visão/OCR (foto/doc) no n8n.
- Sprint 4 — Refino: RLS no DB (camada 2), recorrência avançada da agenda, revisão semanal, premortem de produção, telas de Custo/Financeiro com recharts/Tremor.

## Em andamento (SPECs ativos)
- SPEC-001 — Schema de dados (Prisma, multi-tenant) — `in-progress` (schema pronto+validado; falta migração/RLS SQL + seed)

## Próximas ações
1. Backend foundation: NestJS scaffold + PrismaModule + middleware/RLS + Auth/Tenant + CRUD GTD.
2. Migração inicial + policies RLS (SQL) + seed do tenant Tiago.
3. n8n: workflow principal (filtro gatilho → normalização multimodal → orquestrador → especialistas) + OpenRouter.
4. Dashboard core (Next.js) + multimodal adapters.

## Inputs pendentes do Tiago (para popular na execução)
- Código/palavra do gatilho + número do Evolution (tenant Tiago).
- Provider de transcrição (áudio) e visão/OCR (foto/doc).

## Bloqueios/pendências
- Definir valor do código/palavra do gatilho e número do Evolution do Tiago (popular `Tenant`/`Config` na Sprint 0/1).
- Definir provider de transcrição (áudio) e visão/OCR (foto/doc) — Sprint 1.

## Decisões recentes (links p/ ADR)
- ADR-001 multi-tenant/RLS · ADR-002 modelos OpenRouter · ADR-003 mecanismo de gatilho · ADR-004 n8n-via-API · ADR-005 recorrência da agenda (a registrar nesta Sprint 0).

## Últimos gates Harness
- Nenhum ainda (sem código).
