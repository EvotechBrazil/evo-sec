# ADR-006 — Enforcement completo da RLS (camada 2)   (2026-06-17 · status: aceita)

## Contexto
A migração `20260617000000_rls_policies` habilitou RLS + política `tenant_isolation` em todas as tabelas com `tenant_id`. Hoje a app conecta como **owner** das tabelas, que por padrão **bypassa** RLS — então a enforcement real do banco ainda não está ativa. A camada 1 (filtro por `tenantId` em todos os repositórios via `requireTenantId()`) está ativa e testada.

## Decisão
Para ativar a enforcement de banco (camada 2) em produção, sem quebrar o login:
1. Criar role **não-owner** `evosec_app` com `GRANT SELECT/INSERT/UPDATE/DELETE` nas tabelas; apontar `DATABASE_URL` da app para ela.
2. Garantir que **todo** acesso de dados passe por `PrismaService.withTenant()` (seta `app.current_tenant` por transação) — refatorar repositórios que hoje usam o client direto.
3. Login (`AuthService`) roda sem tenant: criar função `SECURITY DEFINER` `auth_find_user(email)` (owner) para a consulta de login, contornando a RLS apenas nesse ponto.
4. Opcional: `ALTER TABLE ... FORCE ROW LEVEL SECURITY` para sujeitar até o owner.
5. Harness: teste de isolamento cross-tenant deve passar conectado como `evosec_app`.

## Consequências
+ Isolamento à prova de query esquecida no nível do banco. − Refator de repositórios + gestão de roles; login precisa do caminho SECURITY DEFINER. Enquanto não ativado, a camada 1 (app) é a enforcement vigente.
