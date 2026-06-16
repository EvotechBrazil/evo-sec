-- CreateEnum
CREATE TYPE "Prioridade" AS ENUM ('BAIXA', 'NORMAL', 'ALTA');

-- CreateEnum
CREATE TYPE "RecadoStatus" AS ENUM ('PENDENTE', 'LIDO', 'RESOLVIDO');

-- CreateEnum
CREATE TYPE "TarefaTipo" AS ENUM ('PROXIMA_ACAO', 'PROJETO', 'AGUARDANDO', 'ALGUM_DIA');

-- CreateEnum
CREATE TYPE "TarefaStatus" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "LembreteStatus" AS ENUM ('PENDENTE', 'NOTIFICADO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "Recorrencia" AS ENUM ('NENHUMA', 'DIARIO', 'SEMANAL', 'MENSAL', 'ANUAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CompromissoStatus" AS ENUM ('CONFIRMADO', 'TENTATIVO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "Calendario" AS ENUM ('CFA', 'EVOTECH', 'PESSOAL');

-- CreateEnum
CREATE TYPE "ContaTipo" AS ENUM ('A_PAGAR', 'A_RECEBER');

-- CreateEnum
CREATE TYPE "ContaStatus" AS ENUM ('PENDENTE', 'PAGO', 'RECEBIDO', 'ATRASADO');

-- CreateEnum
CREATE TYPE "MetaStatus" AS ENUM ('ATIVA', 'CONCLUIDA', 'PAUSADA');

-- CreateEnum
CREATE TYPE "InvestimentoTipo" AS ENUM ('TESOURO_SELIC', 'TESOURO_IPCA', 'CDB', 'POUPANCA', 'FUNDO_DI', 'LCI_LCA', 'OUTRO');

-- CreateEnum
CREATE TYPE "NivelRisco" AS ENUM ('BAIXO', 'MEDIO', 'ALTO');

-- CreateEnum
CREATE TYPE "ModeloTarefa" AS ENUM ('CLASSIFICAR', 'AGENDA', 'GTD', 'CONSULTA', 'FINANCEIRO', 'FINANCAS');

-- CreateEnum
CREATE TYPE "MidiaTipo" AS ENUM ('AUDIO', 'IMAGEM', 'DOCUMENTO');

-- CreateEnum
CREATE TYPE "ContextoRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "evolution_instance" TEXT,
    "whatsapp_number" TEXT,
    "gatilho_codigo_hash" TEXT,
    "gatilho_sessao_min" INTEGER NOT NULL DEFAULT 30,
    "quiet_hours_inicio" TEXT,
    "quiet_hours_fim" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "totp_secret" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recados" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "remetente" TEXT,
    "conteudo" TEXT NOT NULL,
    "categoria" TEXT,
    "prioridade" "Prioridade" NOT NULL DEFAULT 'NORMAL',
    "status" "RecadoStatus" NOT NULL DEFAULT 'PENDENTE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "recados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarefas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "TarefaTipo" NOT NULL DEFAULT 'PROXIMA_ACAO',
    "aguardando_de" TEXT,
    "data_cobranca" TIMESTAMP(3),
    "prazo" TIMESTAMP(3),
    "prioridade" "Prioridade" NOT NULL DEFAULT 'NORMAL',
    "status" "TarefaStatus" NOT NULL DEFAULT 'PENDENTE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tarefas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lembretes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "data_hora" TIMESTAMP(3) NOT NULL,
    "recorrencia" "Recorrencia" NOT NULL DEFAULT 'NENHUMA',
    "notificado" BOOLEAN NOT NULL DEFAULT false,
    "status" "LembreteStatus" NOT NULL DEFAULT 'PENDENTE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "lembretes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compromissos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3),
    "dia_inteiro" BOOLEAN NOT NULL DEFAULT false,
    "local" TEXT,
    "participantes" TEXT[],
    "calendario" "Calendario" NOT NULL DEFAULT 'PESSOAL',
    "regra_recorrencia" TEXT,
    "recorrencia_pai_id" UUID,
    "lembrete_antecedencia_min" INTEGER,
    "status" "CompromissoStatus" NOT NULL DEFAULT 'CONFIRMADO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "compromissos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo" "ContaTipo" NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT,
    "valor_centavos" INTEGER NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "recorrencia" "Recorrencia" NOT NULL DEFAULT 'NENHUMA',
    "status" "ContaStatus" NOT NULL DEFAULT 'PENDENTE',
    "pago_em" TIMESTAMP(3),
    "contraparte" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "contas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metas_financeiras" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "valor_alvo_centavos" INTEGER NOT NULL,
    "valor_atual_centavos" INTEGER NOT NULL DEFAULT 0,
    "prazo" TIMESTAMP(3),
    "aporte_mensal_sugerido_centavos" INTEGER,
    "alerta_atraso" BOOLEAN NOT NULL DEFAULT true,
    "status" "MetaStatus" NOT NULL DEFAULT 'ATIVA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "metas_financeiras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investimentos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo" "InvestimentoTipo" NOT NULL,
    "instituicao" TEXT,
    "valor_aplicado_centavos" INTEGER NOT NULL,
    "data_aplicacao" TIMESTAMP(3) NOT NULL,
    "rendimento_estimado" TEXT,
    "liquidez" TEXT,
    "risco" "NivelRisco" NOT NULL DEFAULT 'BAIXO',
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "investimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contatos_vip" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "organizacao" TEXT,
    "prioridade_padrao" "Prioridade" NOT NULL DEFAULT 'ALTA',
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "contatos_vip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT false,
    "aberta_em" TIMESTAMP(3),
    "expira_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contextos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sessao_id" TEXT,
    "role" "ContextoRole" NOT NULL,
    "conteudo" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contextos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modelos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tarefa" "ModeloTarefa" NOT NULL,
    "modelo_primario" TEXT NOT NULL,
    "fallbacks" TEXT[],
    "teto_tokens" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modelos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usos_llm" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tarefa" "ModeloTarefa" NOT NULL,
    "modelo" TEXT NOT NULL,
    "tokens_in" INTEGER NOT NULL,
    "tokens_out" INTEGER NOT NULL,
    "custo_micro_usd" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usos_llm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "midias" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo" "MidiaTipo" NOT NULL,
    "storage_url" TEXT NOT NULL,
    "transcricao" TEXT,
    "ocr_texto" TEXT,
    "acessado_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "midias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "recados_tenant_id_status_idx" ON "recados"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "recados_tenant_id_created_at_idx" ON "recados"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "tarefas_tenant_id_status_idx" ON "tarefas"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "tarefas_tenant_id_tipo_idx" ON "tarefas"("tenant_id", "tipo");

-- CreateIndex
CREATE INDEX "tarefas_tenant_id_data_cobranca_idx" ON "tarefas"("tenant_id", "data_cobranca");

-- CreateIndex
CREATE INDEX "lembretes_tenant_id_data_hora_idx" ON "lembretes"("tenant_id", "data_hora");

-- CreateIndex
CREATE INDEX "lembretes_tenant_id_status_idx" ON "lembretes"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "compromissos_tenant_id_inicio_idx" ON "compromissos"("tenant_id", "inicio");

-- CreateIndex
CREATE INDEX "compromissos_tenant_id_calendario_idx" ON "compromissos"("tenant_id", "calendario");

-- CreateIndex
CREATE INDEX "compromissos_recorrencia_pai_id_idx" ON "compromissos"("recorrencia_pai_id");

-- CreateIndex
CREATE INDEX "contas_tenant_id_status_idx" ON "contas"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "contas_tenant_id_vencimento_idx" ON "contas"("tenant_id", "vencimento");

-- CreateIndex
CREATE INDEX "contas_tenant_id_tipo_idx" ON "contas"("tenant_id", "tipo");

-- CreateIndex
CREATE INDEX "metas_financeiras_tenant_id_status_idx" ON "metas_financeiras"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "investimentos_tenant_id_tipo_idx" ON "investimentos"("tenant_id", "tipo");

-- CreateIndex
CREATE INDEX "contatos_vip_tenant_id_idx" ON "contatos_vip"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "configs_tenant_id_chave_key" ON "configs"("tenant_id", "chave");

-- CreateIndex
CREATE INDEX "sessoes_tenant_id_ativa_idx" ON "sessoes"("tenant_id", "ativa");

-- CreateIndex
CREATE INDEX "contextos_tenant_id_sessao_id_created_at_idx" ON "contextos"("tenant_id", "sessao_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "modelos_tenant_id_tarefa_key" ON "modelos"("tenant_id", "tarefa");

-- CreateIndex
CREATE INDEX "usos_llm_tenant_id_created_at_idx" ON "usos_llm"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "midias_tenant_id_tipo_idx" ON "midias"("tenant_id", "tipo");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recados" ADD CONSTRAINT "recados_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lembretes" ADD CONSTRAINT "lembretes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compromissos" ADD CONSTRAINT "compromissos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compromissos" ADD CONSTRAINT "compromissos_recorrencia_pai_id_fkey" FOREIGN KEY ("recorrencia_pai_id") REFERENCES "compromissos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas" ADD CONSTRAINT "contas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas_financeiras" ADD CONSTRAINT "metas_financeiras_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investimentos" ADD CONSTRAINT "investimentos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contatos_vip" ADD CONSTRAINT "contatos_vip_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configs" ADD CONSTRAINT "configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contextos" ADD CONSTRAINT "contextos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modelos" ADD CONSTRAINT "modelos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usos_llm" ADD CONSTRAINT "usos_llm_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "midias" ADD CONSTRAINT "midias_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
