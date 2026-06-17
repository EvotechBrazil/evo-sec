# HARNESS — Sprint 1 Backend — 2026-06-16

Ambiente: Postgres 16 (Docker), migração `init` aplicada, seed do tenant Rodrigo.

| Gate | Status | Notas |
|---|---|---|
| Smoke | ✅ | `GET /api/v1/health` → 200 `{status:ok}` |
| Integration (auth JWT) | ✅ | `POST /auth/login` → 200 + accessToken; CRUD recado 201/200 persistido com tenantId |
| Integration (auth serviço n8n) | ✅ | `POST /tarefas` com `x-service-token`+`x-tenant-id` → 201 |
| Security (isolamento) | ✅ | `GET /recados` sem credencial → 401 |
| Integration (agenda) | ✅ | `GET /agenda/disponibilidade` → 200 `{disponivel:true,conflitos:[]}` |
| Build | ✅ | `nest build` OK; entry `dist/main.js` |
| Migração | ✅ | `prisma migrate dev --name init` aplicada; seed OK (6 modelos, 6 configs) |

Resultado: **APROVADO** para o escopo backend GTD+Agenda da Sprint 1.

Pendências de hardening (registradas, não bloqueiam o MVP):
- RLS no nível do banco (camada 2) ainda não forçada — enforcement atual é app-layer (`requireTenantId` em toda query). Tarefa dedicada de segurança fará policies PG + role não-owner + função SECURITY DEFINER para login (ADR-001).
- Expansão de recorrência da agenda na leitura (ADR-005) — Sprint 4 (refino).
