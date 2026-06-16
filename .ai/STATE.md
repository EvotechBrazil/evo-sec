# STATE — evo-sec (Nina)   (atualizado 2026-06-16 por Claude)

## Status atual
**Backend Sprint 1 COMPLETO e PROVADO na `main`** (PRs #1–5): estrutura/governança, schema (16 entidades), foundation NestJS, auth dupla (JWT + token de serviço n8n), contexto de tenant, CRUD GTD (Recados/Tarefas/Lembretes) + Agenda (disponibilidade/conflito), migração `init` + seed (tenant Tiago, 6 modelos OpenRouter, 6 configs). **Harness E2E verde** contra Postgres real (health/login/CRUD/serviço/401/agenda). `gh` autenticado, perms git liberadas. Postgres local via Docker (container `evosec-pg`). **Em andamento:** n8n (prompts + filtro de gatilho + guia) → falta dashboard + multimodal + Sprints 2/3/4.

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
