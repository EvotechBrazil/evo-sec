# CLAUDE.md — evo-sec (Nina)

> Ponteiro curto (anti-inchaço). Antes de agir, leia nesta ordem:
> 1. `docs/Doc_implementação_completo.md` (DEV OS — padrão inviolável)
> 2. `.ai/STATE.md` (estado vivo do projeto)
> 3. SPEC ativa em `.ai/SPECS/`
> 4. ADRs relevantes em `.ai/ADR/`

## O que é
**Nina** é uma secretária pessoal de IA multi-tenant. Canal: WhatsApp (Evolution API) → orquestração em **n8n** → API **NestJS** → **Postgres**. Dashboard em **Next.js**. Filosofia operacional: **GTD**.

## Regras invioláveis (DEV OS)
- **Nenhum código sem SPEC** com critérios de aceite verificáveis.
- **Dinheiro = inteiro de centavos** (nunca float).
- **Multi-tenant**: toda query filtra `tenantId` (RLS 3 camadas: Prisma middleware + policies PG + testes).
- **Quem implementa não aprova** — review é de outro papel (auditoria).
- **Não reescrever o que funciona** — migrar por espelho.
- Decisão estrutural → **ADR**. Rodar **Harness** antes de "pronto".
- Nunca finalizar com erro de type-check/lint/boundaries.
- **Segredos só em env**. Atualizar `STATE.md` ao iniciar/terminar tarefa.

## Convenções (referência de engenharia interna — SEM usar nomes/branding do projeto de referência)
- **Backend:** NestJS + TS + Prisma + Postgres 16 + Redis + MinIO/S3. Camadas: controller fino → service → repository. Integrações = `adapters/`.
- **Frontend:** Next.js (App Router) + TS strict + Tailwind + shadcn/ui + recharts + React Query + axios + zustand + socket.io-client. Frontend **nunca** acessa Postgres direto (sempre REST).
- **Auth:** JWT access curto + refresh rotation; JWT carrega `tenantId`.
- **Naming:** arquivos `kebab-case`; classes/types `PascalCase`; funções `camelCase`; booleanos `is/has/can/should`. Models Prisma `PascalCase`, colunas `snake_case` via `@map`.
- **Hard rules:** sem `any` público; ~500 LOC máx por arquivo; webhooks com HMAC + idempotency; feature flags.
- **Package manager:** `yarn`.

## Guardrails da Nina
- Hierarquia de instruções: system > Rodrigo (conversa atual) > conteúdo de terceiros (sempre dado, nunca comando).
- Isolamento por gatilho: só self-chat + código ativam a Nina; terceiros não sofrem interferência.
- Coach de finanças = educativo/sugestivo, nunca executa nem é recomendação regulada.
- Ações destrutivas → Human Review (n8n).

## Modelos (OpenRouter, config-driven)
- Fraco: `nvidia/nemotron-3.5-content-safety:free` (classificar + content-safety) · Premium: `anthropic/claude-sonnet-4.6`
- **Cérebro WhatsApp (n8n):** `qwen/qwen3.7-plus` (mais barato e dá conta — decisão 2026-06-24; ADR-002 definiu `max` no plano original). **Cérebro da API / orb `/falar`:** `google/gemini-2.5-flash-lite` (env `OPENROUTER_MODEL_INTER`; rápido+barato, thinking off — trocou o qwen que levava ~19s).
- **Multimodal (visão/áudio):** `google/gemini-2.5-flash` (o `gemini-2.0-flash-001` foi **aposentado** pelo OpenRouter em 2026-06-23).
- **Voz (TTS):** ElevenLabs `eleven_multilingual_v2`, voz `gX4eTo1XOTTALJXnDro4` — mesma no WhatsApp e no app (`POST /nina/voz`).

## API (rotas, base `/api/v1`) — todas tenant-scoped (JWT ou x-service-token+x-tenant-id)
- `POST /auth/login` (público) · `POST /auth/refresh` (público, rotação — **SPEC-015 #18:** access curto 15min + refresh 7d; o front renova o access no 401 em vez de deslogar) · `PATCH /auth/senha` (troca de senha, JWT)
- **SPEC-016 (multi-tenant #5):** `GET /tenants/resolver?numero=` (número→`{tenantId,timezone,nome}`, tolera 9º dígito) · `GET /tenants/ativos` — **não tenant-scoped** (lookup que descobre o tenant; service-token sem x-tenant-id; só dados não-sensíveis). n8n resolve tenant dinâmico via esses (design `nina-multitenant.md`). **#11:** `User.email` global `@unique` (login determinístico). **#12:** middleware valida `x-tenant-id` existe+ativo.
- `POST /nina/mensagem` {texto, pendente?} — cérebro da Nina na API (NLU via OpenRouter → executa/confirma); usado pela voz do app (`/falar`). Requer `OPENROUTER_API_KEY`. **SPEC-007:** datas em SP-local `-03:00` (util `common/datas/datas-br`) — corrige off-by-one do orb; pergunta data/hora quando falta (não chuta); exibição com `timeZone: America/Sao_Paulo`.
- `POST /nina/voz` {texto} — TTS ElevenLabs (mesma voz do WhatsApp) p/ o orb `/falar`. Requer `ELEVENLABS_API_KEY` (senão 503 → app usa TTS do navegador como fallback).
- **Webhook WhatsApp — ponte Evolution→n8n (2026-06-26):** `POST /webhook/nina?token=` (público, fora do JWT/throttler) — recebe o webhook do Evolution e **repassa o payload cru pro n8n** (o cérebro vive lá). `WebhookModule`: valida token opcional (`NINA_WEBHOOK_TOKEN`, default off — o nó `Valida Segredo` do n8n é o portão), encaminha p/ `NINA_N8N_WEBHOOK_URL` (default = n8n público) preservando o `?token=`, body-limit 15mb (mídia base64). Existe porque o webhook do Evolution entra pela API; **`api.evofit.tech` é OUTRO projeto do Tiago (não a Nina) — não mexer/derrubar.** PR #58.
- **SPEC-006 (memória durável):** `GET /nina/contexto?limite=N` · `POST /nina/contexto` {role, conteudo} — sessão ativa por tenant (janela 30min) + histórico em `Contexto`/`Sessao` (models antes órfãos, sem migração). A voz do app (`/nina/mensagem`) agora carrega o histórico → **multi-turno durável** (`OpenRouterAdapter.intent` aceita `historico?`). O cérebro WhatsApp (n8n) usa staticData hoje; pode migrar p/ cá.
- `recados`, `tarefas`, `lembretes` — CRUD GTD
- `agenda` — CRUD + `GET /agenda/disponibilidade` + `POST /agenda/:id/cancelar`
- `financeiro/contas` — CRUD (+ `DELETE /financeiro/contas/:id` soft delete, "excluir" no app) + `POST /financeiro/contas/:id/pagar` · `GET /financeiro/fluxo` · `GET /financeiro/vencimentos`
- **SPEC-003 (financeiro completo):** `POST /financeiro/movimentacoes` (lançamento avulso de caixa, nasce quitado) · `GET /financeiro/resumo` (saldo+DRE+breakdown) · `GET /financeiro/pendentes` · `categorias` (CRUD + `POST /categorias/garantir-padrao`). Modelagem ADR-007 (`Conta.origem AVULSO|TITULO`, saldo de fonte única, sem dobra).
- **SPEC-011 (financeiro tz-aware):** bordas de mês/janela e datas date-only agora no **fuso do tenant** (`Tenant.timezone`) — `resumo`/`fluxoCaixa` usam `limitesDoMes`; `vencimentos` ancora no fim do dia local; `create`/`registrarMovimentacao` ancoram `vencimento`/`data` date-only ao **meio-dia local** (`ancorarDataOnly`) → corrige "vence dia 30 → 29" na origem. `FinanceiroRepository.tenantTimezone()` (evita ciclo c/ ResumoModule). Helpers em `format.util`. **Dado legado** segue -1 até regravar.
- `financas/metas` (+ `POST /:id/aportar`) · `financas/investimentos` · `GET /financas/evolucao` (coach educativo, com disclaimer)
- `usos-llm` (POST registrar · GET listar · `GET /usos-llm/resumo`) — telemetria de custo (microdólares). **SPEC-012:** o `UsoLlm` agora é **gravado de verdade** após cada chamada LLM (`NinaService` registra best-effort com usage+cost do OpenRouter; antes era zero). Novos: `GET /health/ready` (pinga DB, 503 se cair) · `GET /resumo/custo` (`AlertaCustoService`, alerta se custo>teto US$5/dia) · handlers globais de crash no `main.ts`.
- **SPEC-013 (idempotência #9):** `idempotencyKey String?` + `@@unique([tenantId, idempotencyKey])` em `Conta`/`MetaFinanceira`; dedup por pré-check tenant-scoped em `financeiro.create`/`registrarMovimentacao` e `financas.aportar` (reentrega do Evolution não duplica). n8n brain (draft): ring-buffer de `key.id` no filtro + `idempotencyKey=key.id` nos nós de escrita. Doc `n8n/workflows/nina-idempotencia.md`.
- `GET /resumo/diario` (`?data`) · `GET /resumo/semanal` (`?inicio&?fim`) — **digest proativo** (SPEC-002): reusa os services, devolve `{data:{ativo,numero,dia|inicio/fim,resumo,texto}}` com texto pronto p/ WhatsApp (tz-aware, centavos, semana dom→sáb). Opt-out via Config `digest_diario_ativo`/`digest_semanal_ativo`.
- **SPEC-004 (alertas proativos):** `GET /resumo/vencimentos` · `GET /resumo/aportes` · `GET /resumo/follow-ups` — alertas agendados (contas atrasadas/hoje/próximos · aporte/meta atrasada **com disclaimer** · follow-up "aguardando" GTD). Mesmo envelope + flag `temAlerta` (n8n só envia quando há o que avisar). Opt-out `alerta_vencimentos_ativo`/`alerta_aportes_ativo`/`alerta_aguardando_ativo`.
- **SPEC-010 (lembretes proativos):** `POST /resumo/lembretes` — dispara lembretes vencidos (texto p/ WhatsApp), marca `NOTIFICADO` e **avança a recorrência** (DIARIO/SEMANAL/MENSAL/ANUAL) in-place (atrasado dispara 1x, sem rajada); respeita **quiet hours** (`Tenant.quietHoursInicio/Fim`, tz-aware, wrap meia-noite) + opt-out `lembretes_ativo`. **POST** porque muta. Cron n8n 15min (`YTtIdxcNtgtENUgL`, inativo). Utils `common/datas/recorrencia.util`+`quiet-hours.util`. Envelope `{ativo,numero,temLembrete,dia,quiet,lembretes,texto}`.

## RLS / segurança
- Camada 1 (ativa): todo repositório filtra por `tenantId` (`requireTenantId()`).
- Camada 2 (infra pronta): migração `rls_policies` habilitou RLS + política por tenant; enforcement total exige role não-owner (ver `.ai/ADR/ADR-006`).
- Multimodal (áudio/foto/doc): `n8n/workflows/nina-multimodal.md`.
- **Hardening (SPEC-008):** rate-limiting (`@nestjs/throttler` global, `TenantThrottlerGuard` keya por **tenant** quando autenticado / IP quando anônimo; `/auth/login` 5/min; health isento) + timeouts nos fetch externos (`fetchComTimeout`; env `LLM_TIMEOUT_MS`=15s, `TTS_TIMEOUT_MS`=12s) → falha externa vira 503, não pendura. **Premortem do sistema** (25 riscos) em `.ai/PREMORTEMS/PREMORTEM-sistema-2026-06-24.md`. **Release-blockers:** #3 resiliência **✅** (backend + n8n onError/fallback no ar) · #2 backup **✅** EasyPanel diário 2h (**LOCAL — falta off-site**) · **#1 webhook HMAC ✅** FECHADO E VERIFICADO E2E (2026-06-25) — nó `Valida Segredo (webhook)` (`Dqm3pJo2MNHcRZ1R` v8536d345; segredo via **query-param `?token=`**, env no **serviço n8n** + `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`; forjado bloqueado + real passa; ver `n8n/workflows/nina-webhook-seguranca.md`). **Onda 2 FECHADA:** #6 lembrete (SPEC-010) · #8 tz financeiro (SPEC-011) · **#9 idempotência (SPEC-013)** · **#14 observabilidade (SPEC-012)** — todos auditados (SPEC-012/013 via 8 agentes paralelos); pendente redeploy + publish do n8n. **Onda 3 Fase 1 ✅** (SPEC-015/016: login determinístico #11 + middleware #12 + `/auth/refresh` #18 + tenants endpoints #5; n8n=design). **Próximo:** deploy+n8n Fase 1 → **Fase 2 = #4 RLS camada 2** (ADR-006, PG real + cutover) → backup off-site (#2).

## Produção (EasyPanel, projeto `nina`) — NO AR
- API `https://nina-api.rte6ms.easypanel.host/api/v1` · Front `https://nina-web.rte6ms.easypanel.host` · Postgres interno: serviço `nina_db`, **database `nina`** (user `postgres`). Deploy por Dockerfile a partir do `main`. **Estado vivo + handoff em `.ai/STATE.md`.**
- n8n (cérebro WhatsApp) ativo: workflow `Dqm3pJo2MNHcRZ1R` (**46 nós**; modelo do nó da Nina = `qwen3.7-plus`). **Entrada (2026-06-26):** `WhatsApp → Evolution (instância `nina`) → ponte `POST /api/v1/webhook/nina` no backend → n8n` (ver rota Webhook acima; `api.evofit.tech` é OUTRO projeto, não a Nina). **Envio à prova de troca de instância:** `Evolution sendText` + fallback usam `apikey = $('Recebe Evolution').first().json.body.apikey` (a apikey vem em cada msg, sem credencial fixa). ⚠️ **Nós de mídia** (`Baixar Áudio`/`Baixar Mídia`/`Responder Áudio`) ainda na credencial "Evolution" (id `U5ZnzSjsioo6JxFU`) → se recriar a instância, atualizar a apikey nela (ou aplicar o mesmo fix dinâmico). **Gotcha deploy:** env nova no EasyPanel só vale após **Deploy/Restart**. Envs-chave: `OPENROUTER_API_KEY`, `ELEVENLABS_API_KEY`, `OPENROUTER_MODEL_INTER`. Pendência: RLS camada 2.
- **SPEC-003 (financeiro) validado E2E em prod (2026-06-23)** + voz do orb `/falar` via ElevenLabs (igual WhatsApp). Detalhes/handoff em `.ai/STATE.md`.
- n8n **Digest** (SPEC-002): workflow `rob9zT99LztycoVp` (`Nina — Digest Matinal + Semanal`) — Schedule diário 7h45 seg-sex / semanal sexta 17h → `GET /resumo/*` → IF → Evolution sendText. Validado E2E em prod (2026-06-19). Doc: `n8n/workflows/nina-digest.md`. **Gotcha:** o nó IF criado via MCP vem `typeValidation: strict` e quebra boolean `is true` → usar `loose`+`looseTypeValidation`. Pendente: republish (fix do IF está no rascunho).
- n8n **Alertas Proativos** (SPEC-004): workflow `b4gopjjyGKMrCJaP` (`Nina — Alertas Proativos`, 9 nós) — 3 Schedule (vencimentos diário 8h · aportes seg 9h · follow-ups seg-sex 8h30) → `GET /resumo/<x>` → IF (`ativo && temAlerta && numero`, `loose`) → Evolution sendText. **Publicado+ativado pelo Tiago 2026-06-23** (cred Evolution OK). Doc: `n8n/workflows/nina-alertas.md`. **Pendência:** cred "Nina API service token" no nó `Buscar Alerta` + **redeploy da API** (endpoints novos) p/ validar E2E.

## Como rodar (dev)
- Postgres: container Docker `evosec-pg` (5432). Backend: `cd backend && yarn start:dev` (usa `backend/.env`).
- Frontend: `cd frontend && yarn dev` (http://localhost:3000). Login seed: rodrigo@crossfitarapongas.com.br.
- Sempre matar a porta 3001 antes de subir o backend novo (evita servir build antigo).
