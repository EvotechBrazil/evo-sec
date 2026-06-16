# ADR-004 — n8n orquestra, mas CRUD passa pela API NestJS   (2026-06-16 · status: aceita)

## Contexto
n8n poderia escrever direto no Postgres, mas isso espalharia regra de negócio e burlaria a RLS/auditoria.

## Decisão
n8n cuida de orquestração, roteamento e chamadas de LLM. **Toda persistência (CRUD) é feita via API REST do backend NestJS**, que centraliza validação, regra de negócio, RLS multi-tenant e auditoria. n8n autentica com token de serviço carregando contexto de tenant.

## Alternativas consideradas
- n8n com Postgres node direto (descartado: duplica regra, risco de vazamento, sem auditoria central).

## Consequências
+ Fonte única de verdade e segurança centralizada. − Latência extra (HTTP) e necessidade de endpoints internos.
