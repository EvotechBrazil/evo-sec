# STATE — evo-sec (Nina)   (atualizado 2026-06-17 por Claude)

## Status atual
**TODAS as sprints (1–4) concluídas e testadas (E2E + Playwright) na `main`** (10 PRs). Backend: GTD + Agenda (com recorrência) + Financeiro + Finanças/coach + Custo, auth dupla, tenant, migração+seed, RLS camada 2 migrada. Dashboard: 6 telas. n8n: prompts + filtro de gatilho + multimodal (docs). Premortem de produção pronto.

### Workflow n8n vivo (2026-06-17) — ✅ ATIVO E TESTADO NO WHATSAPP (texto + ÁUDIO→ÁUDIO)
**Criado e funcionando** (n8n self-hosted easypanel): `Nina — Principal (WhatsApp)`, id **`Dqm3pJo2MNHcRZ1R`**, projeto `ScHAXN5Y8b3AwBfN`, **14 nós**. Testado E2E: texto→texto e **áudio→áudio** (manda áudio, Nina transcreve e responde em voz).
- **Evolution**: base reportada `https://alicia-evolution-api.rte6ms.easypanel.host` (server_url do payload), instância `nina`. Credenciais selecionadas na UI pelo Rodrigo; workflow publicado.
- **Fix aplicado**: comparação de número tolerante ao 9º dígito BR (`554399864409` ≡ `5543999864409`) — o WhatsApp entrega o JID sem o nono dígito.
- **Áudio (multimodal entrada/saída)**: por padrão **áudio recebido → resposta em áudio**. Transcrição via **OpenRouter `openai/whisper-1`** (endpoint `/audio/transcriptions`, `input_audio.{data,format}`); voz via **ElevenLabs** `eleven_multilingual_v2`, voz `r1KmysJdVYZjJCm4mL3b` → base64 (`extractFromFile`) → `sendWhatsAppAudio`.
  - ⚠️ A credencial do nó **Gerar Voz (ElevenLabs)** é Header Auth **`xi-api-key`** (separada da Evolution `apikey`). Reusar a Evolution dá 401.
- **De-branding aplicado**: o system prompt da Nina (nó **Nina (OpenRouter)**) e `n8n/prompts/nina-base.md` **não citam empresas/marcas/outros sistemas** — produto genérico, foco na tarefa pessoal.
- ⚠️ **Ainda só conversacional**: responde via LLM mas **não persiste** (recados/tarefas/financeiro). A camada de tools (especialistas → API NestJS `/api/v1`) exige **API_BASE público** (n8n não alcança `localhost:3001`).
- Fluxo (14 nós): Webhook `POST /webhook/nina` → **Filtro de Gatilho** (isolamento self-chat+sessão, config inline; áudio sempre processa) → **Roteia** (texto/mídia/pronta/áudio) → [texto: **Nina (OpenRouter)** `qwen/qwen3.7-max` → **Monta Resposta** (define `modo`) → **Modo de Resposta** (texto→`sendText` | áudio→**Gerar Voz (ElevenLabs)**→**Voz para Base64**→**Responder Áudio**)] · [áudio: **Baixar Áudio**→**Transcrever (OpenRouter)**→**Prep Texto Áudio**→Nina] · [mídia: "peça texto"→send] · [pronta: send direto].
- Fonte versionada: `n8n/workflows/nina-main.workflow.ts` (SDK code, **re-sincronizado com o vivo + validado** `valid:true`, 14 nós).
- URL produção do webhook: `https://alicia-n8n.rte6ms.easypanel.host/webhook/nina` · test: `/webhook-test/nina`.
- Próxima iteração: camada de **tools** (orquestrador tier-fraco + especialistas chamando a API NestJS `/api/v1` com `x-service-token`+`x-tenant-id`) — exige **API_BASE público**.

Outras pendências de deploy: enable RLS camada 2 (role não-owner, ADR-006) e GO/NO-GO de produção.

### Redesign do Dashboard (2026-06-17) — ✅ FEITO E TESTADO
**Tema mobile-first preto + amarelo, fonte Archivo (Google Fonts), premium "noir".** Definido via 9 mockups + 4 híbridos (rotas `/mockups/*`, mantidas como referência viva). Direção escolhida pelo Rodrigo: home estilo "equilíbrio" (v6) + Finanças/Custo estilo "painel" (v8) + tela de voz "orbe" (v7); display em **Archivo**.
- Fundação: `src/app/layout.tsx` (Archivo + `class="dark"`), `tailwind.config.ts` (darkMode class, fontFamily Archivo, tokens Tremor light+dark, safelist de cores de chart), `globals.css` (bg neutral-950). `@tremor/react`+`recharts` instalados (tokens dark prontos); gráficos atuais são **SVG nativos** (Area/Donut/Spark/Progress) no UI kit, batendo pixel com os mockups aprovados.
- UI kit: `src/components/ui.tsx` (Card, SectionTitle, Pill, Progress, Spark, StatTile, AreaChartSvg, Donut, VoiceOrb, MicIcon, Loading, EmptyState, PageHeader).
- Shell: `(dashboard)/layout.tsx` (header + bottom nav 6 itens com ícones + FAB de voz → `/falar`). Login tematizado.
- 7 telas reais com dados da API + estados loading/empty: Início, Agenda (agrupada por dia), Espera, Financeiro (KPIs + donut a pagar×receber + listas), Pé-de-meia (total + metas Progress + investimentos + disclaimer), Custo (KPIs + donut por modelo), **Falar com a Nina** (`/falar`, orbe + waveform + contexto).
- **Validado**: `tsc --noEmit` verde; testado E2E no Playwright (login real + 7 telas, viewport 390px). Screenshots na raiz: `app-*.png`.
- Deploy do front: provavelmente **Vercel** (Rodrigo). Pendente: trocar `NEXT_PUBLIC_API_URL` para o backend público; favicon; PWA opcional.

### Histórico
**Sprint 1 MVP** (7 PRs): (1-5) backend NestJS — auth dupla, tenant, CRUD GTD (Recados/Tarefas/Lembretes) + Agenda, migração `init` + seed, **Harness E2E verde** contra Postgres real; (6) n8n — prompts da Nina + filtro de gatilho (isolamento) + guia de setup; (7) dashboard Next.js (login + Início + Agenda + Aguardando, `next build` OK). `gh` autenticado, perms git liberadas, Docker `evosec-pg` rodando.

## Próximas ações (roadmap restante)
- Sprint 2 — Financeiro (gestão): módulo Conta (CRUD, padrão Recados) + fluxo de caixa + CRON vencimentos + tela.
- Sprint 3 — Finanças (coach): Meta + Investimento + tela de evolução + CRON aporte/alerta.
- Multimodal: adapters de transcrição (áudio) e visão/OCR (foto/doc) no n8n.
- Sprint 4 — Refino: RLS no DB (camada 2), recorrência avançada da agenda, revisão semanal, premortem de produção, telas de Custo/Financeiro com recharts/Tremor.

## Em andamento (SPECs ativos)
- SPEC-001 — Schema de dados (Prisma, multi-tenant) — `in-progress` (schema pronto+validado; falta migração/RLS SQL + seed)

## Próximas ações
1. Backend foundation: NestJS scaffold + PrismaModule + middleware/RLS + Auth/Tenant + CRUD GTD.
2. Migração inicial + policies RLS (SQL) + seed do tenant Rodrigo.
3. n8n: workflow principal (filtro gatilho → normalização multimodal → orquestrador → especialistas) + OpenRouter.
4. Dashboard core (Next.js) + multimodal adapters.

## Inputs pendentes do Rodrigo (para popular na execução)
- Código/palavra do gatilho + número do Evolution (tenant Rodrigo).
- Provider de transcrição (áudio) e visão/OCR (foto/doc).

## Bloqueios/pendências
- Definir valor do código/palavra do gatilho e número do Evolution do Rodrigo (popular `Tenant`/`Config` na Sprint 0/1).
- Definir provider de transcrição (áudio) e visão/OCR (foto/doc) — Sprint 1.

## Decisões recentes (links p/ ADR)
- ADR-001 multi-tenant/RLS · ADR-002 modelos OpenRouter · ADR-003 mecanismo de gatilho · ADR-004 n8n-via-API · ADR-005 recorrência da agenda (a registrar nesta Sprint 0).

## Últimos gates Harness
- Nenhum ainda (sem código).
