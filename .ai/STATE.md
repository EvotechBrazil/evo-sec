# STATE — evo-sec (Nina)   (atualizado 2026-06-18 por Claude)

## Status atual
**EM PRODUÇÃO no EasyPanel.** Sprints 1–4 concluídas + deploy completo + camada de tools do n8n (Nina persiste de verdade). Backend (GTD, Agenda, Financeiro, Finanças/coach, Custo), Dashboard (6 telas) e n8n rodando ponta a ponta, validados E2E por texto e áudio no WhatsApp.

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
- **6 ações:** recado, tarefa, lembrete, conta (A_PAGAR/A_RECEBER, `valorCentavos` inteiro), agenda/compromisso, conversa.
- **Auth da API:** header `x-service-token` via credencial Header Auth **"Nina API service token"** (id `106lKMqNprmKFB1k`) + `x-tenant-id` literal (tenant `00000000-0000-0000-0000-000000000001`).
- **Áudio:** transcrição via **`google/gemini-2.0-flash-001`** (chat/completions, `input_audio` ogg). ⚠️ **OpenRouter NÃO transcreve o `ogg/opus` do WhatsApp via `/audio/transcriptions` + whisper (dá 404 "Provider returned 404"; whisper só aceita wav/mp3)** → por isso Gemini. Resposta em voz via **ElevenLabs** `eleven_multilingual_v2` (credencial Header Auth `xi-api-key`, ≠ Evolution `apikey`).
- ⚠️ **MCP n8n** bloqueia criar/listar credenciais e anexar `httpHeaderAuth` via `addNode` → nós HTTP novos precisam ter a credencial selecionada na UI + **Publish**.
- **De-branding** mantido (sem citar empresas/marcas). Evolution: `https://alicia-evolution-api.rte6ms.easypanel.host`, instância `nina`.

### Dashboard (2026-06-17) — tema mobile-first preto+amarelo, Archivo
6 telas (Início, Agenda, Espera, Financeiro, Pé-de-meia, Custo) + Falar (`/falar`). UI kit `src/components/ui.tsx`. Dados reais da API; estados loading/empty. Validado E2E (Playwright) e em produção.

## Roadmap restante
- **Troca de senha** (endpoint + tela) — em andamento.
- **Mais tools no n8n:** pagar conta, criar/aportar meta, cancelar/disponibilidade de agenda, **visão/OCR** (foto/documento).
- **RLS camada 2** (ADR-006): role não-owner + `DATABASE_URL` apontando p/ ela (owner bypassa RLS).
- **Pré-prod:** rotacionar segredos, CORS restrito, GO/NO-GO.

## Histórico
Sprints 1–4 (10 PRs): backend NestJS (auth dupla JWT + `x-service-token`, tenant, CRUD GTD, Agenda c/ recorrência, Financeiro, Finanças/coach, Custo), dashboard, n8n (prompts + filtro + multimodal). Deploy EasyPanel: PRs #16 (Dockerfile backend) e #17 (Dockerfile frontend).

## Decisões (ADR)
ADR-001 multi-tenant/RLS · ADR-002 modelos OpenRouter · ADR-003 gatilho · ADR-004 n8n-via-API · ADR-005 recorrência agenda · ADR-006 RLS camada 2 (role não-owner).
