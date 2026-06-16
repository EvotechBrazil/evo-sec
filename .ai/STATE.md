# STATE — evo-sec (Nina)   (atualizado 2026-06-16 por Claude)

## Status atual
Plano aprovado (`MASTERPLAN.md`). **Sprint 0 concluída** (branch `chore/sprint-0-foundation`). **Sprint 1 em andamento** (branch `feat/sprint-1-schema`): schema Prisma (SPEC-001) **validado** + **backend foundation NestJS compilando** (yarn install + prisma generate + nest build OK): bootstrap, PrismaService com `withTenant()` (RLS camada 1), contexto de tenant (AsyncLocalStorage), env.config, filtro/erro padrão, envelope `{data,meta}`, health. PRs/merge dependem do Tiago colar o snippet de permissões git em `.claude/settings.local.json`.

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
