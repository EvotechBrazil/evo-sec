-- CreateEnum
CREATE TYPE "ContaOrigem" AS ENUM ('AVULSO', 'TITULO');

-- CreateEnum
CREATE TYPE "CategoriaTipo" AS ENUM ('RECEITA', 'DESPESA');

-- CreateEnum
CREATE TYPE "GrupoDre" AS ENUM ('VENDA', 'CUSTO_DIRETO', 'DESPESA_FIXA', 'PESSOAL', 'TRIBUTO', 'FINANCEIRO', 'EXTRAORDINARIA');

-- AlterTable
ALTER TABLE "contas" ADD COLUMN     "categoria_id" UUID,
ADD COLUMN     "origem" "ContaOrigem" NOT NULL DEFAULT 'TITULO';

-- CreateTable
CREATE TABLE "categorias" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "CategoriaTipo" NOT NULL,
    "grupo_dre" "GrupoDre" NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "categorias_tenant_id_tipo_idx" ON "categorias"("tenant_id", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_tenant_id_nome_key" ON "categorias"("tenant_id", "nome");

-- CreateIndex
CREATE INDEX "contas_tenant_id_origem_idx" ON "contas"("tenant_id", "origem");

-- AddForeignKey
ALTER TABLE "contas" ADD CONSTRAINT "contas_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS (camada 2) para a nova tabela categorias — mesmo padrão de 20260617000000_rls_policies (ADR-001/006).
ALTER TABLE "categorias" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "categorias";
CREATE POLICY tenant_isolation ON "categorias" USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
