-- SPEC-013 — Idempotência de escrita (dedup de reentrega do webhook).
-- Coluna nullable: linhas antigas (null) não conflitam (PG trata NULLs como distintos no índice único).

-- AlterTable
ALTER TABLE "contas" ADD COLUMN     "idempotency_key" TEXT;

-- AlterTable
ALTER TABLE "metas_financeiras" ADD COLUMN     "idempotency_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "contas_tenant_id_idempotency_key_key" ON "contas"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "metas_financeiras_tenant_id_idempotency_key_key" ON "metas_financeiras"("tenant_id", "idempotency_key");
