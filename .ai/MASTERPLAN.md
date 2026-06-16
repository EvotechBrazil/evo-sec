# Plano — Nina, Secretária Pessoal de IA (projeto evo-sec)

> Planejamento completo (sem código ainda). Segue o padrão **DEV OS** (Spec first · State always updated · Premortem protects · Harness proves · Deploy only when verified), a filosofia **GTD**, e usa as **boas práticas de engenharia do projeto de referência interno (ex-"Bravy") como base — sem reusar nomes/branding daquele projeto**.

---

## 1. Contexto (por quê)

Tiago (CrossFit Arapongas + Evotech) precisa de uma secretária executiva de IA — **Nina** — que capture recados, agende compromissos, crie lembretes, cobre follow-ups ("aguardando resposta"), faça gestão financeira pessoal e atue como coach de investimentos, tudo via WhatsApp e com dashboard mobile.

Diretrizes do Tiago que moldam a arquitetura:
1. **Orquestração no n8n com economia de tokens** — o que for determinístico não passa por LLM.
2. **Orquestrador + agentes especialistas** por tarefa.
3. **Postgres puro** (NÃO Supabase), inclusive a dashboard.
4. **Multimodal**: entende texto, **áudio, foto e documentos**.
5. **Multi-tenant** (pronto pra mais de uma conta no futuro).
6. **Padrões de engenharia do projeto de referência interno**, sem usar os nomes dele.
7. **Repo já criado:** `https://github.com/EvotechBrazil/evo-sec.git`.

Infra já no ar: **n8n (VPS/EasyPanel) + Postgres + Evolution API (WhatsApp)**. Tudo **desacoplado** (integrações como adapters plugáveis). **Classe P1.**

---

## 2. Decisões fechadas

| Tema | Escolha |
|---|---|
| Nome do agente | **Nina** |
| Agentes | **Orquestrador (n8n, determinístico) + especialistas** |
| Banco | **Postgres puro** (sem Supabase), via **Prisma** |
| Multimodal | **Texto + áudio (transcrição) + foto/documento (visão/OCR)** |
| Multi-tenant | **Sim** — toda query filtra `tenantId`; RLS 3 camadas |
| Modelos | **OpenRouter**, 3 tiers config-driven (ver §7) |
| Agenda | **Nativa em Postgres** (sem Google Calendar), recursos equivalentes |
| Financeiro | **Pessoal** (contas a pagar/receber, salário/renda, fluxo de caixa) |
| Coach finanças | **Completo**: acompanha saldos/aportes + alertas/metas automáticas |
| Gatilho | **Self-chat + código** (modo sessão); terceiros não sofrem interferência |
| Package manager | **yarn** |
| Dashboard | **Next.js + Tailwind + shadcn/ui + recharts** (referência visual: tremor.io) |
| Execução | **Sprints Scrum**: 8 agentes build em paralelo + 3 de auditoria |

---

## 3. Arquitetura geral

```
WhatsApp (Tiago → ele mesmo, com código)     Terceiros → Tiago (conversa normal)
        │                                             │
        ▼                                             ▼
Evolution API ──► Webhook n8n (workflow PRINCIPAL)  (ignorado: filtro derruba no 1º nó)
                       │
               [1] FILTRO DE GATILHO  ◄── tenant + self-chat (fromMe, remoteJid=próprio nº) + sessão/código ativa
                       │  (99% dos eventos saem aqui = economia + privacidade)
               [2] NORMALIZAÇÃO MULTIMODAL
                       │   texto direto · áudio→transcrição · foto/doc→visão/OCR (via adapters/OpenRouter)
               [3] ORQUESTRADOR (dispatcher determinístico; classificador LLM barato só no ambíguo)
                       │  dispara a tarefa para o(s) especialista(s)
   ┌──────────┬────────┴───┬──────────────┬──────────────┬──────────────┐
   ▼          ▼            ▼              ▼              ▼              ▼
 AGENDA      GTD        CONSULTA      FINANCEIRO      FINANÇAS     (destrutivas)
                                     (gestão)        (coach)      → Human Review
   │          │            │              │              │              │
   └──────────┴────────────┴──────────────┴──────────────┴──────────────┘
                       │ CRUD via API (regra de negócio + RLS centralizados)
                       ▼
              Backend NestJS (API REST /api/v1 · RLS multi-tenant · adapters)
                       │ Prisma
                       ▼
                   Postgres ◄── Redis (cache/jobs/realtime pubsub) · MinIO/S3 (mídia)
                       ▲
                       │ REST + React Query + Socket.io
              Dashboard Next.js (telas + chat widget) ── instalável (PWA)

Workflows CRON (n8n, sem LLM quando possível — SQL+template):
  Briefing matinal · Revisão semanal · Verificação contínua · Vencimentos · Lembrete/alerta de aporte
```

**Princípio de acoplamento:** n8n faz orquestração/roteamento/LLM, mas **CRUD vai pela API NestJS** (não SQL cru), para centralizar regra de negócio, validação, auditoria e **RLS multi-tenant** num só lugar. Integrações externas (Evolution, OpenRouter, transcrição, visão, storage) são **adapters** plugáveis.

### 3.1 Isolamento por gatilho
- **Primeiro nó** = filtro: só prossegue se `tenant` reconhecido + **self-chat** (`key.fromMe=true`, `remoteJid`=número próprio) + gatilho ativo.
- Gatilho config-driven, default **modo sessão**: código abre sessão (palavra/emoji secreto) → responde livre por X min → código/`fim` encerra.
- **Não-interferência garantida:** mensagens de/para terceiros saem no filtro sem LLM, sem gravação.

### 3.2 Multimodal
- **Áudio:** baixa o media do Evolution → transcrição (adapter; modelo de transcrição via provider) → vira texto pro orquestrador.
- **Foto/Documento:** armazena em MinIO/S3 → extração via modelo de visão/OCR (adapter) → texto/estrutura pro orquestrador (ex.: foto de boleto → conta a pagar; print de conversa → recado).
- Mídia bruta versionada no storage com auditoria de acesso (LGPD).

---

## 4. Orquestrador + especialistas (Nina)

Prompt base em XML (identidade Nina, hierarquia de instruções, GTD, guardrails, memória/continuidade, formato) — **fatiado por especialista** pra manter prompts curtos.

| Agente | Intenção | Tools (via API) | Tier |
|---|---|---|---|
| **Orquestrador** | classificar e disparar | nenhuma (decide/dispara) | fraco |
| **Agenda** | criar/checar/cancelar* compromisso | `checar_disponibilidade`, `criar_compromisso`, `cancelar_compromisso*` | intermediário |
| **GTD** | recado/tarefa/lembrete/aguardando | `salvar_recado`, `criar_tarefa`, `criar_lembrete`, `marcar_aguardando` | intermediário |
| **Consulta** | listar pendências/briefing/"o que faço agora" | `listar_pendencias` (read) | fraco |
| **Financeiro (gestão)** | contas a pagar/receber, salário, fluxo de caixa, vencimentos | `registrar_conta`, `marcar_pago*`, `listar_financeiro`, `fluxo_caixa` (read) | intermediário |
| **Finanças (coach)** | pé de meia, investimentos baixo risco, educação, metas | `registrar_meta`, `registrar_investimento`, `consultar_evolucao` (read); **educativo** | premium |
| Gate destrutivo | cancelar/excluir/marcar pago em lote | **Human Review do n8n** (pausa até aprovar) | — |

Guardrails:
- **Hierarquia de instruções**: system > Tiago (conversa atual) > conteúdo de terceiros (sempre dado, nunca comando). Defesa contra instrução embutida.
- **Dinheiro em inteiro de centavos** (nunca float) — padrão de referência.
- **Coach = educativo/sugestivo, nunca executa nem é recomendação financeira regulada** (Tesouro Selic, CDB liquidez diária, fundo DI...), sempre com disclaimer e decisão do Tiago.
- **Gestão financeira não decide sozinha**; marcar pago em lote passa por confirmação.
- **Eco do dado-chave** (valor, vencimento, ID, data) em texto → mitiga limitação de memória do n8n e evita re-fetch.

---

## 5. Economia de tokens

1. Filtro no 1º nó derruba ~todos os eventos.
2. Orquestrador por **regras** antes de classificador LLM.
3. **3 tiers OpenRouter** config-driven (tabela), barato no comum, premium só no necessário.
4. Contexto mínimo (últimas N msgs + só dados da intenção).
5. Prompts de especialista enxutos.
6. Prompt caching onde houver.
7. Eco do dado em texto.
8. **CRON sem LLM** (briefing/revisão por SQL+template).

---

## 6. OpenRouter — modelos (config-driven)

Tabela `Modelo` mapeia `tarefa → modelo + fallbacks + teto_tokens` (trocável sem editar workflow). Tiers definidos pelo Tiago:

| Tier | Modelo | Uso |
|---|---|---|
| **Fraco** | `nvidia/nemotron-3.5-content-safety:free` | classificar intenção, consultas simples, **e camada de segurança** (detectar instrução embutida/jailbreak — é um modelo de content-safety, encaixa como guardrail grátis) |
| **Intermediário** | `qwen/qwen3.7-max` | agenda, GTD, financeiro (raciocínio padrão) |
| **Premium** | `anthropic/claude-sonnet-4.6` | coach de finanças, ambiguidade/itens múltiplos, fallback de qualidade |

- Fallback automático via array do OpenRouter.
- Telemetria de custo por chamada → tabela `UsoLlm` → dashboard + alerta de orçamento.

---

## 7. Modelo de dados (Postgres + Prisma, multi-tenant)

Convenções de referência: **models Prisma `PascalCase`**, colunas `snake_case` via `@@map`/`@map`; **UUID**; **`tenantId` em toda tabela** + índices compostos por tenant; **RLS 3 camadas** (Prisma middleware + policies PostgreSQL + testes); soft delete (`deletedAt`); auditoria (`createdBy/updatedBy` + timestamps); **dinheiro em inteiro de centavos**; timezone America/Sao_Paulo na borda; secrets cifrados (AES-256-GCM).

Entidades (DDL definitivo vira SPEC + migração):
- **Tenant** — conta/usuário (Tiago = 1º), config do Evolution (instância/número), timezone, quiet hours, código/sessão do gatilho.
- **Recado** — remetente, conteudo, categoria, prioridade, status.
- **Tarefa** — titulo, descricao, tipo(proxima_acao|projeto|aguardando|algum_dia), aguardando_de, data_cobranca, prazo, prioridade, status.
- **Lembrete** — titulo, data_hora, recorrencia, notificado, status.
- **Agenda nativa:**
  - **Compromisso** — titulo, descricao, inicio, fim, dia_inteiro, local, participantes[], calendario(cfa|evotech|pessoal), regra_recorrencia(rrule-like), recorrencia_pai_id, status, lembrete_antecedencia_min. Disponibilidade/conflito via `tstzrange`+índice GiST. Recorrência: regra guardada + **expansão na leitura** (ADR).
- **Financeiro (pessoal):**
  - **Conta** — tipo(a_pagar|a_receber), descricao, categoria, valor_centavos, vencimento, recorrencia, status(pendente|pago|recebido|atrasado), pago_em, contraparte. (Salário/renda = a_receber recorrente; gastos fixos = a_pagar recorrente.) Fluxo de caixa = view.
- **Finanças (coach):**
  - **MetaFinanceira** — nome, valor_alvo_centavos, valor_atual_centavos, prazo, aporte_mensal_sugerido_centavos, status, alerta_atraso.
  - **Investimento** — tipo(tesouro_selic|cdb|poupanca|fundo_di|...), instituicao, valor_aplicado_centavos, data, rendimento_estimado, liquidez, risco.
- **ContatoVip** — nome, telefone, organizacao, prioridade_padrao, observacoes.
- **Config** — chave/valor por tenant (timezone, quiet hours, horários de rotina, gatilho).
- **Sessao** — controle do gatilho (ativa, aberta_em, expira_em).
- **Contexto** — memória conversacional (sessao_id, role, conteudo).
- **Modelo** — tarefa, modelo_primario, fallbacks[], teto_tokens, ativo.
- **UsoLlm** — tarefa, modelo, tokens_in/out, custo_estimado.
- **Midia** — referência ao storage (tipo, url, transcricao/ocr, auditoria de acesso).

---

## 8. Stack & convenções (referência interna, sem nomes)

- **Backend:** NestJS + TypeScript (modular: `adapters/`, `modules/<feature>/` com controller fino → service → repository, `common/` guards/filters/events, `config/`), Prisma + Postgres 16, Redis (cache/BullMQ/realtime pubsub), MinIO/S3 (mídia). **yarn.**
- **Frontend:** Next.js (App Router) + React + TypeScript strict + Tailwind + shadcn/ui + **recharts** (visual inspirado no tremor.io) + React Query + axios + zustand + socket.io-client. **yarn.**
- **Auth:** JWT access (curto) + refresh rotation; 2FA opcional; JWT carrega `tenantId`.
- **Frontend NUNCA acessa Postgres direto** → sempre REST API.
- **Regras hard:** sem `any` em público; máx ~500 LOC por arquivo; naming kebab-case (arquivos), PascalCase (componentes/classes), camelCase (funções), `is/has/can/should` (booleanos); webhooks com HMAC + idempotency; feature flags; **nada de nomes/branding do projeto de referência**.
- **Deploy:** Docker Compose (postgres, redis, backend, frontend) → EasyPanel; secrets só em env.

---

## 9. Dashboard

- Telas: Início (feed do dia) · Agenda (dia/semana/mês) · Aguardando Resposta · Lembretes & Tarefas · **Financeiro** (contas, vencimentos, fluxo de caixa) · **Pé de meia/Investimentos** (evolução da meta, aportes, alocação baixo risco, alerta de atraso) · **Custo/Uso de LLM** · Config (VIP, quiet hours, gatilho, rotinas) · **Chat com a Nina** (mesmo backend).
- Realtime via Socket.io (+ React Query polling fallback). PWA instalável.

---

## 10. Repositório & DEV OS

- Repo: **EvotechBrazil/evo-sec** (já criado). Clonar em `e:\Projetos\Sec`, mover os `docs/` atuais pra dentro.
- Estrutura: `backend/` · `frontend/` · `n8n/` (workflows exportados JSON versionados) · `infra/` (docker-compose, env.example) · `docs/` · `.ai/` (CONTEXT.md, STATE.md, MASTERPLAN.md=este plano, SPECS/, ADR/, PREMORTEMS/, HARNESS_RESULTS/).
- `CLAUDE.md` curto na raiz (ponteiro: DEV OS + STATE + SPEC ativa + convenções). Auditores em `.claude/agents/`.

---

## 11. Faseamento (sprints)

- **Sprint 0 — Fundação:** clonar repo, estrutura de pastas, `.ai/` + STATE + CONTEXT + CLAUDE.md, SPEC-001 (schema Prisma), ADRs (recorrência, modelos OpenRouter, gatilho, n8n-via-API), docker-compose + env.example, **Premortem de kickoff (P1)**.
- **Sprint 1 — MVP slice:** schema/migração · backend API CRUD (recados/tarefas/lembretes/agenda) + RLS · n8n: filtro gatilho + normalização multimodal + orquestrador + especialistas Agenda/GTD/Consulta · OpenRouter 3 tiers + UsoLlm · dashboard core (Início/Agenda/Aguardando/Custo) + auth · briefing por SQL+template.
- **Sprint 2 — Financeiro (gestão):** Conta + fluxo de caixa · especialista Financeiro · CRON vencimentos · tela Financeiro · Human Review em marcar pago.
- **Sprint 3 — Finanças (coach):** Meta + Investimento · especialista coach · CRON aporte + alerta de meta atrasada · tela evolução.
- **Sprint 4 — Refino:** revisão semanal + verificação contínua · recorrência avançada · chat na dashboard · VIP/quiet hours finos · premortem de produção (GO/NO-GO).

---

## 12. Modelo de execução (após aprovação): Scrum, 8 build + 3 auditoria

Cada sprint roda como um **Workflow** orquestrado (scrum master = orquestrador): fan-out de até **8 agentes build em paralelo**, depois **3 agentes de conferência/auditoria** verificam antes do gate de Harness e do update de STATE.

**8 agentes build (paralelos por sprint):**
1. DB/Prisma (schema + migrations + RLS)
2. Backend API — núcleo (auth, tenant, CRUD GTD)
3. Backend API — agenda nativa (disponibilidade/recorrência)
4. Backend API — financeiro + finanças
5. n8n — workflow principal (gatilho + normalização + orquestrador)
6. n8n — especialistas + integração OpenRouter (3 tiers)
7. Multimodal — adapters áudio/foto/documento + storage
8. Frontend — dashboard (telas + chat + auth + realtime)

**3 agentes de conferência/auditoria:**
1. **Security/Guardrails** — RLS multi-tenant, isolamento do gatilho, hierarquia de instruções, secrets/HMAC, LGPD.
2. **Harness/QA** — smoke/unit/integration/E2E, gates do DEV OS.
3. **Standards/Architecture** — convenções de referência (naming, LOC, desacoplamento, adapters), ADRs, "sem nomes do projeto de referência".

Regra: quem implementa não aprova; auditoria reprovou → registra em HARNESS_RESULTS → corrige → re-roda → atualiza STATE.

---

## 13. Premortem de kickoff (P1) — riscos-chave

| Risco | P×I | Mitigação |
|---|---|---|
| Nina vaza pra conversa de terceiro | **20** | Filtro self-chat+tenant no 1º nó; testes com terceiros antes de produção |
| Erro em valor financeiro (float/arredondamento) | **20** | Inteiro de centavos; testes de fluxo de caixa |
| Vazamento entre tenants | **20** | RLS 3 camadas + testes de isolamento |
| Custo de token explode | 16 | Tetos por tarefa, UsoLlm, alerta de orçamento, CRON sem LLM |
| Conselho de investimento visto como recomendação regulada | 16 | Coach educativo + disclaimer; nunca executa |
| Instrução embutida sequestra a Nina | 15 | Hierarquia de instruções + camada content-safety (tier fraco) |
| Conta esquecida / pagamento duplicado | 15 | CRON vencimentos + marcar pago via confirmação |
| Multimodal falha (áudio/doc corrompido) | 12 | Fallback "não entendi o anexo"; retry; tipos validados |
| n8n esquece ID entre turnos | 12 | Eco do dado em texto |
| Webhook Evolution duplicado/fora de ordem | 9 | Idempotency key por message_id + dedup |

ADRs a registrar: recorrência da agenda · modelos OpenRouter por tarefa · mecanismo de gatilho · n8n-via-API vs SQL direto · multi-tenant/RLS.

---

## 14. Verificação / Harness

- **Isolamento:** msg de terceiro (simulada) → Nina não reage; self-chat com código → reage; cross-tenant → bloqueado.
- **Multimodal:** áudio→transcreve; foto de boleto→vira conta a pagar; documento→extrai texto.
- **Roteamento:** frases-tipo caem no especialista certo (regras antes de LLM).
- **GTD/Agenda/Financeiro E2E:** registros corretos via API + eco do dado; conflito de agenda detectado; recorrência expande certo; centavos somam certo.
- **Custo:** cada chamada grava em UsoLlm; bate com OpenRouter.
- **Dashboard:** item criado via WhatsApp aparece em realtime; auth/tenant corretos.
- Resultados em `.ai/HARNESS_RESULTS/`. Premortem de produção antes do deploy.

---

## 15. Decisões abertas (defaults — ajustáveis)

- **Estilo do gatilho:** default modo sessão (código abre, expira em X min).
- **Código/palavra do gatilho e número do Evolution:** popular `Tenant`/`Config` na Sprint 0.
- **Modelos de transcrição/visão:** definir adapters na Sprint 1 (provider via OpenRouter/own).
- **Quiet hours e horários das rotinas:** popular na Sprint 1.
