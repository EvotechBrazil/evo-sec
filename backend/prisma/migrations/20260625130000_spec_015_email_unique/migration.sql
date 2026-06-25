-- SPEC-015 #11 — Email globalmente único (login determinístico).
-- Troca o índice único composto (tenant_id, email) por um índice único só em email:
-- 1 conta por email → findFirst({ email }) do login deixa de ser não-determinístico.
-- Migração segura em mono-tenant (sem emails duplicados hoje).

-- DropIndex
DROP INDEX "users_tenant_id_email_key";

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
