# STATE — evo-sec (Nina)   (atualizado 2026-06-22 por Claude)

## Status atual
**EM PRODUÇÃO no EasyPanel.** Sprints 1–4 concluídas + deploy completo + camada de tools do n8n (Nina persiste de verdade). Backend (GTD, Agenda, Financeiro, Finanças/coach, Custo), Dashboard (6 telas) e n8n rodando ponta a ponta, validados E2E por texto e áudio no WhatsApp.

> **2026-06-22 — Reset de dados p/ teste full:** bancos **dev** (local Docker `evosec-pg`, zerado + re-seedado) e **prod** (`nina` @ VPS/EasyPanel) limpos — 12 tabelas de dados truncadas (`RESTART IDENTITY CASCADE`). Em prod, `tenants/users/modelos/configs` **preservados** (login + roteamento WhatsApp + modelos intactos); schema/migrations mantidos. Login owner inalterado.

### Produção (EasyPanel) — ✅ NO AR (2026-06-18)
Painel `https://easypanel.evotechsystem.cloud` (IP `72.61.57.251`, wildcard `*.rte6ms.easypanel.host`). Projeto **`nina`**, 3 serviços:
- **`db`** — Postgres 16. Host interno: `nina_db:5432`, database `nina`, user `postgres`.
- **`api`** — `https://nina-api.rte6ms.easypanel.host/api/v1`. Build por **Dockerfile** (`backend/Dockerfile` + `docker-entrypoint.sh` roda `prisma migrate deploy` + seed no boot). Source = repo público `main`, path `/backend`.
- **`frontend`** — `https://nina-web.rte6ms.easypanel.host`. Build por **Dockerfile** (`frontend/Dockerfile`, Next 14, `NEXT_PUBLIC_API_URL` embutido no build). Source `main`, path `/frontend`.
- Env/segredos no serviço `api` (JWT*, `SERVICE_TOKEN`, `ENCRYPTION_KEY` [32 chars exatos], `SEED_OWNER_PASSWORD`). Login owner: `rodrigo@crossfitarapongas.com.br`.
- **Deploy:** push no `main` + trigger (webhook `/api/deploy/<token>` ou redeploy no painel). API da EasyPanel é tRPC `POST /api/trpc/*` com body `{json:{...}}` (GET-com-input quebrado no servidor).
- **Pendências de produção:** rotacionar token da API EasyPanel + senha seed; RLS camada 2 (role não-owner, ADR-006); CORS restrito ao domínio do front.

### Workflow n8n vivo (2026-06-18) — ✅ ATIVO, PERSISTE NA API (texto + áudio)
`Nina — Principal (WhatsApp)`, id **`Dqm3pJo2MNHcRZ1R`**, instância `alicia-n8n.rte6ms.easypanel.host`, **21 nós**. Webhook produção `https://alicia-n8n.rte6ms.easypanel.host/webhook/nina`.
- **Fluxo:** Webhook → **Filtro de Gatilho** (self-chat + sessão, tolera 9º dígito BR) → **Nina (OpenRouter `qwen/qwen3.7-max`)** devolve **JSON `{acao, dados, resposta}`** → **Interpreta Acao** (parse robusto) → **Roteia Acao** (switch) → nós HTTP **`API: criar recado/tarefa/lembrete/conta/compromisso`** → **Finaliza Resposta** → **Modo de Resposta** (texto `sendText` | áudio `Gerar Voz (ElevenLabs)`→base64→`sendWhatsAppAudio`).
- **10 ações:** criar recado/tarefa/lembrete/conta/agenda/meta + **pagar_conta, aportar_meta, cancelar_agenda** (act-on-entity, com **confirmação sim/não** via `pendingAction` em static data) + conversa. Visão/OCR (foto→Gemini→Nina).
- **Auth da API:** header `x-service-token` via credencial Header Auth **"Nina API service token"** (id `106lKMqNprmKFB1k`) + `x-tenant-id` literal (tenant `00000000-0000-0000-0000-000000000001`).
- **Áudio:** transcrição via **`google/gemini-2.0-flash-001`** (chat/completions, `input_audio` ogg). ⚠️ **OpenRouter NÃO transcreve o `ogg/opus` do WhatsApp via `/audio/transcriptions` + whisper (dá 404 "Provider returned 404"; whisper só aceita wav/mp3)** → por isso Gemini. Resposta em voz via **ElevenLabs** `eleven_multilingual_v2` (credencial Header Auth `xi-api-key`, ≠ Evolution `apikey`).
- ⚠️ **MCP n8n** bloqueia criar/listar credenciais e anexar `httpHeaderAuth` via `addNode` → nós HTTP novos precisam ter a credencial selecionada na UI + **Publish**.
- **De-branding** mantido (sem citar empresas/marcas). Evolution: `https://alicia-evolution-api.rte6ms.easypanel.host`, instância `nina`.

### Cérebro na API + voz no app (2026-06-18, PR #20)
- **`POST /api/v1/nina/mensagem`** {texto, pendente?} (JWT, tenant-scoped) — `NinaModule` (`OpenRouterAdapter` + `NinaService` reusando os services; services agora `exports`). Mesma lógica do n8n (intenção qwen → executa criar_* ou pede confirmação em pagar/aportar/cancelar), com **confirmação stateless** (API devolve `pendente`; cliente reenvia no "sim"). Requer **`OPENROUTER_API_KEY`** no env (senão 503).
- **Troca de senha:** `PATCH /auth/senha` (JWT) + tela `/configuracoes` + auto-logout em 401 (PRs #18/#19).

### Dashboard (2026-06-17/18) — tema mobile-first preto+amarelo, Archivo
7 telas + **`/falar` agora com VOZ REAL** (Web Speech API STT pt-BR + TTS, chips, fallback de texto, confirmação). UI kit `src/components/ui.tsx`.

## Roadmap restante (HANDOFF — retomar aqui)
**Manual (não dá por código):**
1. ~~**`OPENROUTER_API_KEY`** no env do serviço `api` (EasyPanel) → redeploy.~~ ✅ **RESOLVIDO (2026-06-19):** chave setada no env do `api` + **redeploy** → `/nina/mensagem` voltou (orb da voz no app responde 200). ⚠️ Gotcha: o adapter lê o env **no boot** (`private readonly env = loadEnv()`), então adicionar a env no EasyPanel **só vale após Deploy/Restart** do serviço.
2. **n8n — selecionar credencial + Publish** nos nós HTTP novos: `Listar metas`, `Aportar meta`, `Listar agenda`, `Cancelar compromisso`, `API: criar meta` → **Nina API service token**; `Baixar Midia` → **Evolution**; `Visao (Gemini)` → **OpenRouter account**.
3. **Validar:** voz `/falar` (Chrome); pagar/aportar/cancelar com confirmação (WhatsApp); visão/OCR (foto).
4. **Pré-prod:** rotacionar token EasyPanel + senha seed (via `/configuracoes`); **RLS camada 2** (ADR-006); CORS restrito; GO/NO-GO.

## Histórico
Sprints 1–4 (10 PRs): backend NestJS (auth dupla JWT + `x-service-token`, tenant, CRUD GTD, Agenda c/ recorrência, Financeiro, Finanças/coach, Custo), dashboard, n8n (prompts + filtro + multimodal). Deploy EasyPanel: PRs #16 (Dockerfile backend) e #17 (Dockerfile frontend).

## SPECs
- **SPEC-002** (implementada — validada E2E em produção) — Digest matinal + semanal da Nina. `GET /resumo/diario|semanal` tenant-scoped (`ResumoModule` reusa Recados/Tarefas/Lembretes/Agenda/Financeiro services + `ResumoRepository` p/ VIPs/Config/Tenant). Resposta envelopada `{data:{ativo,numero,dia|inicio/fim,resumo,texto}}` — texto pronto p/ WhatsApp (truncado 2k diário / 4k semanal, tz-aware America/Sao_Paulo, moeda em centavos). Opt-out via Config `digest_diario_ativo`/`digest_semanal_ativo` (ausente=ativo); número = `Tenant.whatsapp_number` → **sem migração**. Helpers `format.util` (sparkline/seta/fmt/tz) portados da skill `relatorio-diario` (Bravy). Workflow n8n documentado em `n8n/workflows/nina-digest.md` (Schedule diário `45 7 * * 1-5` / semanal `0 17 * * 5` → HTTP → IF ativo → Evolution sendText).
  - **Harness:** 22 testes unitários (helpers + service mockado + guarda de tenant no repo) + **E2E real** validado contra Postgres efêmero (vazio→"tudo em dia", populado→agenda/atrasado/vence-hoje, VIP-aguardando, opt-out→ativo:false, 401 sem auth, fuso e moeda corretos). Bug pego e corrigido no E2E: campo `data` colidia com o envelope do ResponseInterceptor → renomeado p/ `dia`.
  - **Workflow n8n `rob9zT99LztycoVp`** (`Nina — Digest Matinal + Semanal`) — 2 Schedule (diário `0 45 7 * * 1-5` / semanal `0 0 17 * * 5`) → HTTP GET `/resumo/*` (httpHeaderAuth + `x-tenant-id`) → IF (`data.ativo` true && `data.numero` notEmpty) → Evolution sendText. Credenciais já apontadas (UI) e workflow **ativo**. IF: o MCP normaliza `typeValidation` p/ `strict` → quebra boolean `is true`; corrigido p/ `loose` + `looseTypeValidation:true` via `setNodeParameter`. Duplicado de teste `4z8kXMEBttdr5kz3` arquivado.
  - **VALIDADO E2E EM PRODUÇÃO (2026-06-19):** execuções manuais `244` (diário) e `245` (semanal) = sucesso; **2 WhatsApps entregues** ao Rodrigo (`5543999864409`). API no ar, credencial OK, número preenchido, fuso/moeda/curva corretos.
  - **Polish (2026-06-19):** curva semanal agora começa no **domingo** (`limitesDaSemana`, label `DSTQQSS`); espaços sobrando removidos nos KPIs (trim por linha); `frontend/src/app/mockups` (v1–v9 órfãos) removido do build.
  - **Pendências (Tiago):** (1) **republicar/Salvar** o workflow n8n — o fix do IF está no rascunho, mas a versão ATIVA ainda é `strict`; sem republish o cron quebra (publish via MCP bloqueado pelo classificador); (2) **redeploy da API** p/ os ajustes de polish (curva domingo + trim) valerem em produção.

- **SPEC-003** (backend + app MVP — branch `feat/spec-003-modulo-financeiro`, validado E2E local; **n8n pendente**) — Módulo financeiro completo: a Nina entende **entrada/saída de caixa**, **contas a pagar/receber**, **baixa de título** e **saldo**; lançamento manual no app via REST (sem WhatsApp). **ADR-007**: `Conta` unificada via `origem AVULSO|TITULO` (avulso nasce quitado → saldo de fonte única, sem dobra); `Categoria` como tabela tenant-scoped com `grupoDre` (DRE); regime de caixa; confirmação desacoplada do canal.
  - **Migração** `20260622225327_spec_003_financeiro` (+`origem`, +`categoria_id`, tabela `categorias` com RLS `tenant_isolation`) + seed **19 categorias** (plano de contas enxuto, ref. skills-contadores).
  - **Backend:** `FinanceiroService.registrarMovimentacao/resumo/pendentes`; novos endpoints `POST /financeiro/movimentacoes`, `GET /financeiro/resumo` (saldo+DRE+breakdown), `GET /financeiro/pendentes`; módulo `categorias` (CRUD + `garantir-padrao` + `resolverPorNome`).
  - **Nina:** novas ações `registrar_movimentacao`, `consultar_saldo`, `consultar_contas`; `criar_conta`/`pagar_conta` agora com **confirmação por botões** (`confirmacao` no `NinaReply` — o canal renderiza: WhatsApp Evolution buttons / app `ConfirmCard`; labels mapeiam AFIRMA/NEGA/"recado"). Prompt do `OpenRouterAdapter` atualizado (regra: "entrou/saiu/paguei"=movimentação; "tenho que pagar/vou receber"=conta; "foi paga"=baixa).
  - **App:** `/financeiro` com **lançamento rápido** (entrada/saída + categoria → REST), **botão baixar** nas pendentes, KPIs do resumo e **donut por categoria** (tema preto+amarelo).
  - **Harness:** typecheck back+front verde; **4 testes unit** (saldo sem dobra); **smoke E2E REST real** (login→+250→−150→saldo 100, sem dobra; 19 categorias). Docs: `.ai/HARNESS_RESULTS/SPRINT-5-spec-003-financeiro.md`, premortem `.ai/PREMORTEMS/PREMORTEM-spec-003-financeiro.md`, SPEC `.ai/SPECS/SPEC-003-modulo-financeiro.md`.
  - **n8n WhatsApp (DRAFT pronto 2026-06-22):** workflow `Dqm3pJo2MNHcRZ1R` agora com 43 nós — prompt do nó `Nina (OpenRouter)` **sincronizado** (12 ações, regra entrou/saiu=movimentação) + switch **`Roteia Financeiro`** que intercepta o fallback (output 11) do `Roteia Acao` + nós `API: registrar movimentacao` (POST /financeiro/movimentacoes), `API: resumo` (GET /financeiro/resumo)→`Formata saldo`, `API: pendentes` (GET /financeiro/pendentes)→`Formata contas`. Fluxo religado com **zero validationWarnings**. As 11 rotas antigas e o `conversa` ficaram intactos. `registrar_movimentacao` executa direto (sem confirmação por botões — incremento futuro).
  - **⚠️ Pendente manual no n8n (Tiago):** (a) anexar a credencial **"Nina API service token"** (httpHeaderAuth) nos 3 nós HTTP novos na UI — o MCP rejeita `genericCredentialType`/publish (limitação conhecida); (b) testar (self-chat: "anota entrada de 250", "qual meu saldo", "o que tenho a pagar") e dar **Publish** (a versão ATIVA ainda é a antiga até publicar — produção segura).
  - **Pendências (Tiago):** (1) credenciais + Publish do n8n (acima); (2) **ConfirmCard**/botões Evolution (confirmação visual no app e WhatsApp); (3) criar conta a pagar/receber com vencimento pelo app; (4) **deploy** da API (migração roda no boot via entrypoint); (5) PR da branch → `main`.
  - **Skills-contadores:** 57 skills ASV/Bravy em `docs/skills-contadores/` (referência, **gitignored** pela licença) + `.claude/skills/01..57` (comandos locais; 56 ativas, `01-simples-nacional` só na referência).

## Decisões (ADR)
ADR-001 multi-tenant/RLS · ADR-002 modelos OpenRouter · ADR-003 gatilho · ADR-004 n8n-via-API · ADR-005 recorrência agenda · ADR-006 RLS camada 2 (role não-owner) · **ADR-007 modelagem financeira** (Conta unificada `origem` + Categoria tenant-scoped + regime de caixa + confirmação desacoplada do canal).
