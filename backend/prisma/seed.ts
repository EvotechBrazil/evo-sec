/**
 * Seed do evo-sec (Nina) — cria o tenant do Tiago, usuário owner, configuração
 * de modelos (OpenRouter, 3 tiers — ADR-002) e config do gatilho (ADR-003).
 * Idempotente (upsert). Segredos/valores reais vêm do ambiente.
 */
import { ModeloTarefa, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const FRACO = process.env.OPENROUTER_MODEL_FRACO ?? 'nvidia/nemotron-3.5-content-safety:free';
const INTER = process.env.OPENROUTER_MODEL_INTER ?? 'qwen/qwen3.7-max';
const PREMIUM = process.env.OPENROUTER_MODEL_PREMIUM ?? 'anthropic/claude-sonnet-4.6';

const MODELOS: { tarefa: ModeloTarefa; primario: string; fallbacks: string[]; teto: number }[] = [
  { tarefa: ModeloTarefa.CLASSIFICAR, primario: FRACO, fallbacks: [INTER], teto: 512 },
  { tarefa: ModeloTarefa.CONSULTA, primario: FRACO, fallbacks: [INTER], teto: 1024 },
  { tarefa: ModeloTarefa.AGENDA, primario: INTER, fallbacks: [PREMIUM], teto: 2048 },
  { tarefa: ModeloTarefa.GTD, primario: INTER, fallbacks: [PREMIUM], teto: 2048 },
  { tarefa: ModeloTarefa.FINANCEIRO, primario: INTER, fallbacks: [PREMIUM], teto: 2048 },
  { tarefa: ModeloTarefa.FINANCAS, primario: PREMIUM, fallbacks: [INTER], teto: 4096 },
];

const CONFIGS: Record<string, string> = {
  timezone: 'America/Sao_Paulo',
  quiet_hours_inicio: '22:00',
  quiet_hours_fim: '07:00',
  horario_briefing_matinal: '07:00',
  horario_revisao_semanal: 'domingo 18:00',
  gatilho_modo: 'sessao',
};

async function main(): Promise<void> {
  const email = process.env.SEED_OWNER_EMAIL ?? 'tiago@crossfitarapongas.com.br';
  const senha = process.env.SEED_OWNER_PASSWORD ?? 'troque-esta-senha';
  const whatsapp = process.env.EVOLUTION_WHATSAPP_NUMBER ?? '';
  const gatilho = process.env.GATILHO_CODIGO ?? 'nina';

  const tenant = await prisma.tenant.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {
      whatsappNumber: whatsapp || undefined,
      evolutionInstance: process.env.EVOLUTION_INSTANCE ?? 'nina',
      gatilhoCodigoHash: await bcrypt.hash(gatilho, 10),
    },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      nome: 'Tiago Santos',
      timezone: 'America/Sao_Paulo',
      evolutionInstance: process.env.EVOLUTION_INSTANCE ?? 'nina',
      whatsappNumber: whatsapp || null,
      gatilhoCodigoHash: await bcrypt.hash(gatilho, 10),
      gatilhoSessaoMin: 30,
      quietHoursInicio: '22:00',
      quietHoursFim: '07:00',
    },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email } },
    update: {},
    create: {
      tenantId: tenant.id,
      email,
      nome: 'Tiago Santos',
      passwordHash: await bcrypt.hash(senha, 10),
      role: 'OWNER',
    },
  });

  for (const m of MODELOS) {
    await prisma.modelo.upsert({
      where: { tenantId_tarefa: { tenantId: tenant.id, tarefa: m.tarefa } },
      update: { modeloPrimario: m.primario, fallbacks: m.fallbacks, tetoTokens: m.teto },
      create: {
        tenantId: tenant.id,
        tarefa: m.tarefa,
        modeloPrimario: m.primario,
        fallbacks: m.fallbacks,
        tetoTokens: m.teto,
      },
    });
  }

  for (const [chave, valor] of Object.entries(CONFIGS)) {
    await prisma.config.upsert({
      where: { tenantId_chave: { tenantId: tenant.id, chave } },
      update: { valor },
      create: { tenantId: tenant.id, chave, valor },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Seed OK — tenant ${tenant.id}, ${MODELOS.length} modelos, ${Object.keys(CONFIGS).length} configs.`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
