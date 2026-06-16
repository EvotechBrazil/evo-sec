# evo-sec — Nina (Secretária Pessoal de IA)

Secretária executiva de IA, multi-tenant, operada por **WhatsApp** (Evolution API) com orquestração em **n8n**, API **NestJS**, banco **PostgreSQL** (Prisma) e dashboard **Next.js** (PWA). Filosofia operacional **GTD**.

> Construído sob o padrão **DEV OS** (`docs/Doc_implementação_completo.md`). Antes de qualquer mudança, leia `CLAUDE.md` e `.ai/STATE.md`.

## Arquitetura (resumo)
```
WhatsApp → Evolution API → n8n (filtro de gatilho → normalização multimodal → orquestrador → especialistas)
        → API NestJS (RLS multi-tenant) → Postgres / Redis / MinIO
        → Dashboard Next.js (REST + realtime)
```
Detalhes: `.ai/MASTERPLAN.md`.

## Estrutura
| Pasta | Conteúdo |
|---|---|
| `backend/` | API NestJS + Prisma (CRUD, RLS, adapters) |
| `frontend/` | Dashboard Next.js (PWA) |
| `n8n/workflows/` | Workflows n8n exportados (JSON, versionados) |
| `infra/` | docker-compose, `.env.example` |
| `docs/` | DEV OS, premortem, visão do produto |
| `.ai/` | Governança: STATE, MASTERPLAN, SPECS, ADR, PREMORTEMS, HARNESS_RESULTS |

## Setup (resumo)
1. `cp infra/.env.example .env` e preencher segredos.
2. `cd infra && docker compose --env-file ../.env up -d` (postgres, redis, minio).
3. `cd backend && yarn && yarn prisma migrate dev && yarn start:dev`.
4. `cd frontend && yarn && yarn dev`.
5. Importar workflows de `n8n/workflows/` na instância n8n.

## Stack
NestJS · Prisma · PostgreSQL 16 · Redis · MinIO/S3 · Next.js (App Router) · Tailwind · shadcn/ui · recharts · React Query · n8n · OpenRouter.

## Convenções
`yarn` · dinheiro em centavos · multi-tenant (RLS) · segredos só em env · ver `CLAUDE.md`.
