# ADR-001 — Multi-tenant com RLS de 3 camadas   (2026-06-16 · status: aceita)

## Contexto
A Nina é uso pessoal hoje, mas deve estar pronta para servir múltiplas contas. Isolamento de dados é requisito P1 (risco P×I=20).

## Decisão
Multi-tenant com `tenantId` em todas as tabelas e **RLS em 3 camadas**: (1) middleware/extension do Prisma que injeta filtro por `tenantId`; (2) policies de Row-Level Security no PostgreSQL; (3) testes automatizados de isolamento cross-tenant. JWT carrega `tenantId`; n8n opera com contexto de tenant via API.

## Alternativas consideradas
- Single-tenant simples (descartado: retrabalho futuro).
- Só filtro de aplicação sem RLS no banco (descartado: uma query esquecida vaza dados).

## Consequências
+ Isolamento robusto e à prova de query esquecida. − Mais complexidade em queries/seed/testes.
