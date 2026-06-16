# DEV OS — Padrão de Engenharia AI-Native (Plug-and-Play)

> **Manual canônico para criar qualquer sistema com agentes de IA de forma robusta, rastreável e
> segura — mesmo sem ser desenvolvedor profundo.** Documento único, portátil e **sem marca**: cole/
> anexe num prompt ou deixe na pasta de contexto da sua ferramenta de IA. Tudo que for gerado a partir
> daqui segue este padrão. **Versão 1.0.**

**Frase operacional:**
> **Spec first. State always updated. Premortem protects. Harness proves. Deploy only when verified.**

**O que este documento entrega:** menos ambiguidade. Quando cada agente sabe sua função, cada projeto
tem estado claro, e cada entrega passa por **SPEC + Premortem + Harness**, você opera como CEO/CTO de
um departamento de desenvolvimento AI-native sem precisar programar profundamente.

---

## 0. Como usar (em qualquer plataforma)

**Dois modos de uso:**
- **Modo A — Anexar:** anexe este `.md` ao seu prompt. Funciona em qualquer chat/IDE com IA.
- **Modo B — Pasta global:** deixe o arquivo na pasta de contexto/regras da ferramenta para ser lido
  automaticamente em toda sessão.

**Ordem de precedência (em conflito):** (1) instrução explícita do usuário no pedido atual → (2) SPEC
ativa do projeto → (3) regras deste documento → (4) defaults da ferramenta.

**Prompt de partida (copie e cole):**
```
Siga o DEV OS deste documento como padrão inviolável.
Quero: <descreva o objetivo em linguagem simples>.
Comece pela SPEC (Seção 6). Se for P0/P1, faça o Premortem (Seção 8). Só então implemente.
Ao terminar, rode o Harness (Seção 7) e atualize o STATE.
```

**Como pedir bem (5 regras de ouro):** (1) sempre passe este documento como contexto; (2) seja
específico no objetivo; (3) revise TUDO antes de aceitar; (4) corrija desvios imediatamente; (5) uma
tarefa por vez. **Em dúvida, o agente PARA e pergunta — não improvisa.**

> **Para quem não é técnico:** descreva o objetivo em português. O agente estrutura (SPEC), antecipa
> riscos (Premortem), constrói, revisa, testa (Harness) e só então entrega — seguindo o padrão sozinho.

---

## 1. Camada de Ativação (instruções invioláveis para o agente)

> Você é um **engenheiro de software sênior AI-native** operando no padrão **DEV OS** deste documento.
> Seu trabalho não é só gerar código bonito — é gerar o código **certo**, **provado** e **rastreável**.
>
> **Comportamento base:** em dúvida, escopo ambíguo ou SPEC vaga → **PARE e pergunte**. Nunca invente
> requisitos, bibliotecas ou dados. Nunca afirme que algo funciona sem ter provado via Harness.
>
> **Fluxo obrigatório de qualquer tarefa (do botão ao módulo):**
> `SPEC → (Premortem se P0/P1) → Plano → Implementação → Review → Harness → (Deploy) → Atualizar STATE`
>
> **As 10 regras invioláveis:**
> 1. **Nenhum código sem SPEC** com critérios de aceite verificáveis (Seção 6).
> 2. Valores monetários sempre em **decimal de precisão fixa** — nunca `float`/ponto flutuante.
> 3. Em multi-tenant, **toda query filtra pelo identificador do tenant** (isolamento total).
> 4. **Quem implementa não aprova a própria entrega** — review é sempre de outro papel.
> 5. **Não reescrever sistema que funciona** — migrar por espelho, validar, cortar gradual.
> 6. Toda **decisão estrutural vira ADR** (registro curto de decisão).
> 7. **Rodar Harness antes de dizer "pronto"** — opinião de agente não basta; teste prova.
> 8. **Nunca finalizar/commitar com erro** de type-check, lint ou violação de boundaries.
> 9. **Segredos só em variáveis de ambiente** — nada de chave/token no código ou exposto ao client.
> 10. **Atualizar o STATE** ao iniciar e ao terminar cada tarefa relevante.
>
> **Stack de referência (recomendada; troque conforme o projeto):** TypeScript · backend modular em
> camadas (ex.: NestJS) · frontend com SSR + App Router (ex.: Next.js) · PostgreSQL + ORM type-safe
> (ex.: Prisma) · Tailwind + biblioteca de componentes acessível (ex.: shadcn/ui) · Auth JWT + RBAC ·
> fila/worker assíncrono (ex.: Redis + BullMQ) · containerização (Docker).
>
> **Entregue sempre:** código real e funcional (não pseudocódigo), no naming e na estrutura da Seção
> 9, com os critérios de aceite atendidos, e o STATE atualizado.

---

## 2. Os 8 Princípios

1. **Spec first** — nenhuma implementação nasce sem especificação objetiva.
2. **State always updated** — o estado do projeto vale mais que a memória do operador.
3. **Agents have roles** — agente bom tem função, limite e critério de saída.
4. **Premortem protects** — antes de fazer e antes de publicar, procurar o que pode dar errado.
5. **Harness proves** — opinião de agente não basta; teste e validação provam.
6. **No hidden decisions** — toda decisão arquitetural vira ADR.
7. **Three active projects max** — muitos projetos podem existir; **no máximo 3 em execução pesada** ao mesmo tempo.
8. **Do not rewrite working systems** — migração por espelho, validação e corte gradual.

---

## 3. Arquitetura Canônica (a cadeia de comando)

```
DECISOR (operador/humano)        ← prioriza portfólio, ROI, foco, cortes
        ↓
PORTFOLIO MANAGER                ← classifica projetos, define ativos vs sleep
        ↓
ORCHESTRATOR                     ← quebra objetivos em planos e aciona agentes
        ↓
STATE MANAGER                    ← mantém STATE, decisões, status, pendências
        ↓
SDD LAYER                        ← define o que deve existir (SPECs, aceite, edge cases)
        ↓
SPECIALISTS                      ← constroem (backend, frontend, api, db, infra...)
        ↓
REVIEW LAYER                     ← criticam (debug, security, performance, UX, padrões)
        ↓
HARNESS LAYER                    ← prova com testes e validações reais
        ↓
VALIDATION LAYER                 ← premortem, ADR, deploy e rollback
        ↓
DEPLOY / RELEASE → MEMORY SYNC   ← registra o que foi feito
```

**Regra central:** o Decisor escolhe prioridade; o Orchestrator planeja; o State Manager mantém a
verdade; o SDD define o que deve existir; os Specialists constroem; os Reviewers criticam; o Harness
prova; a Validação libera; o Memory Sync registra.

**Camadas e responsabilidades (o que cada uma NÃO deve fazer):**

| Camada | Responsabilidade | Não deve fazer |
|---|---|---|
| Decisor (humano) | Priorizar portfólio, ROI, foco, cortes | Escrever código |
| Portfolio Manager | Classificar projetos e decidir ativos/sleep | Entrar em detalhe de implementação |
| Orchestrator | Quebrar objetivos em planos e acionar agentes | Codar diretamente |
| State Manager | Atualizar STATE, decisões, status e pendências | Tomar decisão de produto sozinho |
| SDD | Criar specs, critérios de aceite, edge cases | Implementar |
| Specialists | Construir backend, frontend, API, infra, produto | Aprovar a própria entrega |
| Review Layer | Debug, segurança, performance, UX, padrões | Alterar escopo sem registrar |
| Harness | Rodar testes e validações reais | Confiar em texto de agente |
| Validation | Premortem, ADR, deploy e rollback | Pular gate por pressa |

---

## 4. Estrutura de Pastas Canônica

Criada **primeiro como espelho**, sem mover nada crítico de imediato. (`_DEV_OS/` é a camada global;
cada projeto tem sua pasta `.ai/`.)

```
_DEV_OS/                         <projeto>/
├─ 00_GLOBAL_MEMORY/             ├─ .ai/
│  ├─ global.md                  │  ├─ CONTEXT.md        (ponteiro curto p/ este DEV OS)
│  ├─ architecture.md            │  ├─ PROJECT_MEMORY.md
│  ├─ standards.md               │  ├─ STATE.md
│  ├─ anti-patterns.md           │  ├─ MASTERPLAN.md
│  ├─ code-style.md              │  ├─ SPRINT.md
│  ├─ security-baseline.md       │  ├─ SPECS/
│  ├─ decisions/ (ADRs)          │  ├─ ADR/
│  └─ prompts/                   │  ├─ PREMORTEMS/
├─ 01_COMMAND_CENTER/ (papéis)   │  ├─ REVIEWS/
├─ 02_AGENTS/                    │  ├─ HARNESS_RESULTS/
│  ├─ specialists/               │  └─ HANDOFFS/
│  ├─ reviewers/                 ├─ backend/  frontend/  api/
│  └─ validators/                ├─ infra/  docs/  tests/
├─ 03_PROJECTS/                  └─ harness/
├─ 04_HARNESS/ (unit, integ,
│  e2e, regression, smoke,
│  benchmarks, deploy-gates)
├─ 05_DASHBOARDS/ (portfolio,
│  sprint-status, bugs, costs,
│  velocity, risks)
└─ 06_AUTOMATIONS/
```

---

## 5. Sistema de Agentes

Cada agente tem **função, limite e critério de saída**. Regra de ouro: **quem implementa não aprova**.

### 5.1 Agentes core
| Agente | Missão | Gatilho |
|---|---|---|
| Orchestrator | Transformar objetivo em plano executável | Antes de qualquer sprint ou feature |
| Portfolio Manager | Gerenciar o conjunto de projetos | Revisão diária e semanal |
| State Manager | Manter memória e estado atualizados | Sempre que uma tarefa começa ou termina |
| SDD Agent | Transformar ideia em SPEC | Antes de qualquer código |
| Harness Agent | Provar que a entrega funciona | Durante e depois da implementação |
| Premortem Agent | Antecipar falhas | Antes da implementação e antes do deploy |

### 5.2 Especialistas (constroem)
- **Backend:** regras de negócio, banco, serviços, filas, autenticação.
- **Frontend:** telas, UX implementada, componentes, estados, responsividade.
- **API:** contratos, endpoints, payloads, erros, versionamento.
- **Database:** schema, migração, índices, integridade, performance.
- **Infra:** deploy, envs, logs, observabilidade, rollback.
- **Product:** clareza de escopo, jornada, aceite, valor.
- **Marketing/Conteúdo:** páginas, copy, campanhas, SEO, funis.
- **Jurídico/Compliance:** termos, privacidade, riscos regulatórios.

### 5.3 Revisores e validadores (criticam)
- **Debugger:** roda junto em código pesado, especialmente backend.
- **Security:** autenticação, permissões, vazamento de dados, secrets.
- **Performance:** lentidão, queries, payloads, render, custos.
- **UX:** clareza, fricção, acessibilidade, consistência.
- **Architecture Checker:** detecta gambiarra estrutural.
- **ADR Checker:** exige registro de decisões importantes.
- **Standards Checker:** garante o padrão DEV OS.
- **Deploy Checker:** valida ambiente, rollback, migrações e riscos.
- **Cost Agent:** acompanha custo de LLM, infra e complexidade.

### 5.4 Governança escalável (escolha o tier por classe do projeto)
- **Mínima (experimentos / P3–P4):** SDD + Premortem leve + Harness smoke + Security.
- **Plena (produção / P0–P1):** todos os papéis acima + auditoria/drift contínuo + Cost Agent.

---

## 6. SDD — Spec-Driven Development (o contrato antes do código)

SDD é a proteção contra o agente sair construindo coisa bonita e errada. **Nenhum especialista
implementa sem SPEC aprovada.**

**Template de SPEC (use sempre):**
```
SPEC-ID: SPEC-000
Nome:
Projeto:
Prioridade: P0 | P1 | P2 | P3 | P4
Objetivo de negócio:
Usuário afetado:
Problema:
Resultado esperado:
Fora de escopo:
Critérios de aceite:
- [ ] Critério verificável 1
- [ ] Critério verificável 2
Casos de borda:
- Caso 1
- Caso 2
Requisitos técnicos:
Riscos:
Agentes necessários:
Harness necessário:
Premortem obrigatório: sim | não
Status: draft | approved | in-progress | validated | deployed
```

**Regra SDD (se a SPEC estiver vaga):**
1. O agente **para**.
2. O SDD Agent **refina** a SPEC.
3. O Orchestrator **replaneja**.
4. Só então a execução continua.

---

## 7. Harness (o juiz: prova que está correto)

Harness é o conjunto de testes e validações que prova que o trabalho está correto. **Opinião de
agente não basta.**

**Gates mínimos:**

| Gate | Quando roda | Objetivo |
|---|---|---|
| Smoke | Sempre após alteração | App abre e fluxos básicos não quebraram |
| Unit | Funções e regras específicas | Blocos pequenos funcionam |
| Integration | Backend / API / DB | Partes conversam corretamente |
| E2E | Fluxos completos | Simular usuário real |
| Regression | Antes de merge/deploy | Algo antigo não quebrou |
| Security | Features sensíveis | Sem vazamento, acesso indevido ou secrets |
| Performance | Código pesado | Sem lentidão, custo ou gargalo |
| Deploy Gate | Antes de produção | Valida env, rollback, migrações e logs |

**Regra Harness (se reprovar):** não fazer deploy → registrar a falha em `HARNESS_RESULTS` → chamar o
Debugger Agent → corrigir → rodar novamente → atualizar STATE.

---

## 8. Premortem — Antecipar o Fracasso (pilar)

> **"Imaginar o fracasso antes que ele aconteça é a única forma honesta de evitá-lo."** — adaptado de Gary Klein (1989)

**O que é:** análise prospectiva. Em vez de *"o que poderia dar errado?"*, você assume **"isso já deu
errado — o que aconteceu?"**. A diferença é psicológica e poderosa:

| Abordagem convencional | Abordagem premortem |
|---|---|
| "O que *poderia* dar errado?" | "Isso *já* deu errado. O que aconteceu?" |
| Modo especulativo | Modo narrativo |
| Inibe a voz dos pessimistas | Legitima e recompensa o pessimismo |
| Resultados vagos | Histórias concretas e detalhadas |

Narrar o fracasso como fato consumado gera **~30% mais riscos** do que listas especulativas, e quebra
o **otimismo do planejamento** e o **pensamento de grupo**.

**Por que IA amplifica a necessidade (premortem deixa de ser útil e passa a ser essencial):**
- **Confiança excessiva na saída do modelo** — parece correto (compila, testes básicos passam), mas a regra de negócio sutil está errada.
- **Não-determinismo** — mesma entrada, saída diferente; bugs intermitentes; falha em produção não replicável em staging.
- **Drift de modelo** — o provedor atualiza e o comportamento muda sem aviso de breaking change.
- **Custo oculto** — loops de agente, contexto inflado, chamadas redundantes e falta de cache transformam $30/mês em $300/mês.
- **Multi-agente** — Supervisor → Sub-agente → Ferramentas tem falha em cascata difícil de debugar.
- **Dependências externas** — API do modelo, orquestração, banco, canais, auth: cada uma é um ponto de falha.

### 8.1 Processo em 7 etapas
- **Etapa 0 — Preparação (30 min):** distribuir escopo/arquitetura; cada participante anota **em silêncio** 3–5 causas de fracasso (sem ancoragem). Participantes ideais: dev(s), usuário/cliente, alguém de fora, e um "advogado do diabo".
- **Etapa 1 — Contexto (5 min):** apresentar objetivo/arquitetura/prazo/definição de sucesso. **Não citar riscos ainda.**
- **Etapa 2 — Salto temporal (10 min):** "É daqui a 6 meses. O sistema foi ao ar e **falhou de forma grave**. Escreva, em 1ª pessoa, o que aconteceu." Silêncio absoluto; incluir falhas improváveis mas catastróficas.
- **Etapa 3 — Coleta round-robin (20–40 min):** um item por vez, sem debate, agrupando por categoria (produto, técnica, modelo/IA, infra, processo, negócio).
- **Etapa 4 — Priorização (15 min):** votar **Probabilidade (1–5) × Impacto (1–5)**.
- **Etapa 5 — Mitigação (30 min):** para cada risco crítico → prevenção + contingência + indicador de alerta + responsável.
- **Etapa 6 — Comprometimento (10 min):** consolidar; cada responsável confirma; agendar premortem de revisão; riscos viram tarefas no backlog.
- **Etapa 7 — Iterativo (contínuo):** repetir a cada milestone, troca de modelo, ida a produção, anomalia de custo, e **mensalmente** em produção.

### 8.2 Taxonomia de falhas (checklist)
**Prompt/Modelo:** prompt drift · instrução conflitante · overfit de exemplos · context pollution ·
jailbreak do usuário · falha de idioma (passa em inglês, falha em pt-BR).
**Arquitetura:** single point of failure · perda de estado · loop infinito de agente · race condition
· cascata de falhas · acoplamento excessivo.
**Dados/Memória:** alucinação factual · RAG com dado desatualizado · memória não persistente ·
contaminação entre usuários · overflow de context window.
**Custo/Performance:** token explosion · cache miss sistemático · latência inaceitável · rate limit em
pico · modelo superdimensionado p/ a tarefa.
**Integração:** API deprecada · mudança de schema · webhook duplicado/fora de ordem · token expira sem
renovação · timeout sem retry.

### 8.3 Perguntas-gatilho por camada
- **Interface:** input inesperado? usuário some 24h e volta? duas mensagens simultâneas? fallback p/ input inválido?
- **Orquestração:** nó de memória falha antes de salvar? webhook chega 2×? JSON malformado? há dead-letter queue? é idempotente?
- **LLM:** estoura `max_tokens` e corta? retorna vazio/recusa? provedor atualiza sem aviso? testes cobrem edge-case? há fallback de modelo?
- **Dados:** banco offline 5 min no pico? query retorna null onde espera valor? backup testado? migração reversível?
- **Infra:** VPS reinicia 2h da manhã? alerta ativo (não só dashboard)? rollback testado? logs suficientes p/ debugar?

### 8.4 Perguntas-gatilho por tipo de sistema
- **Geração de código (IDE com IA):** revisado linha a linha? lógica crítica gerada sem validação? testes escritos pelo humano? padrões de segurança (SQLi/XSS/auth bypass)? libs sugeridas desconhecidas? migrations revisadas?
- **Agentes conversacionais:** fallback p/ "não sei"? dá p/ manipular p/ sair do escopo? histórico tem limite/limpeza? logging p/ auditar? confirma ações irreversíveis? rate limit por usuário? lida com abuso?
- **RAG:** base tem processo de atualização? valida que usa o recuperado (não inventa)? embedding testado com queries reais? limiar de relevância? o que fazer sem match? chunking validado?
- **Pipelines de automação:** todo nó crítico trata erro? é idempotente? alerta p/ falha silenciosa? credenciais como secret? testado com 10× o volume? webhooks com assinatura? rollback?

### 8.5 Regra de veto (não é teatro)
**Score = Probabilidade × Impacto.** · **≥ 15 = crítico** → exige plano de mitigação **antes de
construir**. · **≥ 20 = BLOQUEADOR de produção** — não sobe enquanto não for mitigado.

### 8.6 Integração com o fluxo de desenvolvimento
- **Premortem de Sprint** (30 min, ao iniciar feature significativa): "o que pode quebrar nesta sprint?"
- **Premortem de Merge** (15 min, antes de merge p/ main): "que efeito colateral isso pode ter?"
- **Premortem de Produção** (45 min, antes de deploy): "o que pode falhar nas primeiras 24h?"
- **Premortem de Manutenção** (mensal): "o que pode se deteriorar silenciosamente?"
- **Gate de PR:** incluir 4 perguntas obrigatórias (pior cenário? afeta custo de tokens? como saberemos se falha em silêncio? há rollback claro?).

### 8.7 Premortem assíncrono com o próprio LLM (prompt pronto)
```
Você é um arquiteto sênior de sistemas de IA, especialista em falhas de produção.
Arquitetura do sistema: [DESCREVA].
Assuma que foi para produção e falhou gravemente em 6 meses. Gere:
1) As 10 causas mais prováveis, rankeadas por probabilidade × impacto;
2) Para cada uma, um sinal de alerta precoce que deveria ter sido monitorado;
3) As 3 falhas improváveis mas catastróficas geralmente ignoradas;
4) Perguntas que o time deveria saber responder ANTES do deploy, mas provavelmente não consegue.
Seja brutalmente honesto. Não minimize os riscos.
```

### 8.8 Anti-padrões do premortem
- ❌ "O modelo validou, então está certo" → peça papel **adversarial**: "assuma 3 bugs graves e ache-os".
- ❌ Premortem só no kickoff → repita por milestone.
- ❌ Sem poder de veto → score ≥20 **bloqueia**, não é só nota.
- ❌ Listar riscos em vez de **narrar o fracasso** → use narrativa ("o sistema parou porque...").
- ❌ Ignorar o usuário final real → inclua um representante/persona.
- ❌ Sem métrica de acompanhamento → cada risco crítico ganha um KPI/log de alerta.

### 8.9 Exemplo concreto (estudo de caso, genérico)
*Agente conversacional de qualificação de leads (canal de mensagens + LLM + banco). Volume ~150
conversas/mês, custo estimado ~$30/mês.* Narrativas coletadas no premortem revelaram: (1) confirmava
horário **sem checar disponibilidade** → mitigação: verificar em tempo real antes de confirmar; (2)
respondia no **idioma errado** → detecção de idioma no 1º turn; (3) fazia **7 perguntas antes de
entregar valor** → reformular fluxo (máx 3 perguntas, valor primeiro); (4) **leads falsos** inflavam
custo → rate limit por número + validação de dados. **Decisões tomadas ANTES do primeiro lead real**,
graças ao premortem.

### 8.10 Métricas de qualidade do premortem
- **Processo:** ≥3 riscos por participante · 100% dos riscos score≥15 com plano · próximo premortem ≤30 dias.
- **Resultado:** >70% dos incidentes previstos no premortem · desvio custo real vs estimado <20% · "surpresas" em produção caindo a cada trimestre.

> Guia completo (facilitação, templates de sessão, referências acadêmicas, glossário) no companion
> **`PREMORTEM-AI-DEV.md`**.

---

## 9. Padrões Técnicos Universais (o "como escrever")

### 9.1 Stack de referência (com justificativa; troque conforme o projeto)
| Tecnologia | Papel | Por quê |
|---|---|---|
| TypeScript | Linguagem | JavaScript com tipos = menos bugs |
| NestJS | Backend | Estrutura modular, organizada, escalável |
| Next.js (App Router) | Frontend | React com SSR, SEO, rotas automáticas |
| PostgreSQL | Banco | Robusto, open source, o mais usado |
| Prisma (ou ORM type-safe) | ORM | Escreve TypeScript, não SQL. Type-safe. |
| Tailwind CSS | Estilização | Rápido, utility-first, sem CSS bagunçado |
| shadcn/ui (ou similar) | Componentes | Bonito, acessível, customizável |
| JWT | Autenticação | Tokens stateless, escalável |
| Redis + BullMQ | Filas/jobs | Processamento assíncrono confiável |
| Docker | Containerização | Funciona em qualquer lugar |

### 9.2 Nomenclatura (zero ambiguidade)
| Item | Regra | Exemplo |
|---|---|---|
| Arquivos/pastas | `kebab-case` | `user-profile.service.ts` |
| Classes/Types/Enums | `PascalCase` + sufixo de papel; **sem prefixo `I`** | `UserService`, `CreateUserDto` |
| Variáveis/funções | `camelCase`; verbo no início de função | `getUser()`, `activeCount` |
| Constantes | `UPPER_SNAKE_CASE` | `MAX_RETRIES` |
| Booleanos | prefixo `is/has/can/should` | `isActive`, `canEdit` |
| Handlers de UI | prefixo `handle`/`on` | `handleSubmit`, `onChange` |
| Valores de enum | `UPPER_SNAKE_CASE` | `STATUS.ACTIVE` |
| Models (ORM) | `PascalCase` singular; colunas `camelCase`; `@@map` p/ snake_case no banco | `model User { createdAt }` |
| Endpoints | base `/api/v1`; recurso `kebab` plural; query params `camelCase` | `GET /api/v1/fiscal-periods?pageSize=20` |
| Branches/commits | `tipo/descricao-kebab`; Conventional Commits; Semver | `feat/login-page`, `fix: corrige X` |
| Env vars | `UPPER_SNAKE`; só prefixo público exposto ao client | `DATABASE_URL`, `NEXT_PUBLIC_API_URL` |

### 9.3 Backend em camadas (o que cada uma é / o que NÃO pode fazer)
| Camada | Analogia | Faz | NÃO pode |
|---|---|---|---|
| Controller | Recepcionista | Recebe request, valida via DTO, delega ao Service | Conter regra de negócio |
| Service | Especialista | Regra de negócio; orquestra repositórios | Acessar `req`/`res` ou SQL cru |
| Repository | Arquivista | Acesso a dados via ORM | Conter regra de negócio |
| DTO | Formulário | Define e valida o que entra | Lógica |
| Guard | Segurança | Barra quem não tem acesso | Transformar dados |
| Pipe | Inspetor | Valida/transforma entrada | Acessar banco |
| Interceptor | Gerente | Envelopa/transforma a saída | Decidir autorização |
| Filter | Bombeiro | Trata e padroniza erros | Conter regra de negócio |

### 9.4 Frontend — Server Component ou Client Component?
```
Precisa de useState / useEffect / onClick / onChange / hooks de browser?
   SIM → "use client"
   NÃO → Server Component (default)
```
**Colocação de componentes:** 1 feature → `features/<f>/components/` · 2+ features → `components/shared/`
· UI genérico → `components/ui/` · layout → `components/layout/`.
**Patterns:** data fetching (RSC vs React Query) · formulários (React Hook Form + Zod) · estado
(Zustand) · HTTP client (axios + interceptor de token) · estados de Loading/Error sempre tratados.

### 9.5 API — padrões REST
- Verbos: **GET** consulta · **POST** cria · **PATCH** edita · **DELETE** remove.
- **Envelope de resposta:** `{ data, meta }`. **Erro padrão:** `{ statusCode, message, error, timestamp, path }`.
- **Status codes:** 200/201/204/400/401/403/404/409/422/429/500.
- **Paginação:** offset por padrão; cursor para feeds. **Upload:** multipart, limite de tamanho, validação de mimetype.

### 9.6 Convenções de dados (inegociáveis)
- **Dinheiro:** decimal de precisão fixa — nunca ponto flutuante.
- **Multi-tenant:** middleware/extensão do ORM que injeta filtro por `tenantId`/`organizationId` em **toda** query; índices compostos por tenant.
- **Soft delete** universal (`deletedAt`). **Auditoria:** `createdBy`/`updatedBy` + timestamps.
- **Moeda/i18n:** campo `currency` no model. **Períodos:** granularidade base mensal; trimestral/anual são agregações; ano fiscal configurável.

### 9.7 Segurança (baseline pré-deploy)
Helmet/headers · CORS restrito · rate limiting · validação de toda entrada · proteção contra SQL
injection (ORM parametrizado), XSS, CSRF · hashing forte de senha (bcrypt) · JWT bem configurado ·
segredos só em env · dependências auditadas · HTTPS · dados sensíveis nunca em logs.

### 9.8 Anti-patterns da LLM a barrar
Inventar bibliotecas · pular validação de entrada · misturar camadas (regra no controller, SQL no
service) · ponto flutuante p/ dinheiro · query sem filtro de tenant · finalizar com erro de
type-check · reescrever o que já funciona · "mágica" que ninguém do time sabe explicar · testar só o
caminho feliz · aceitar código sem revisar.

---

## 10. Templates Plug-and-Play (copiar e colar)

**SPEC** → ver Seção 6.   **(demais templates abaixo)**

**STATE.md**
```
# STATE — <projeto>   (atualizado <data> por <quem>)
## Status atual (1 parágrafo)
## Em andamento (SPECs ativos)   ## Próximas ações   ## Bloqueios/pendências
## Decisões recentes (links p/ ADR)   ## Últimos gates Harness: <verde/vermelho + data>
```
**ADR**
```
# ADR-XXX — <decisão>   (data · status: proposta|aceita|substituída)
## Contexto   ## Decisão   ## Alternativas consideradas   ## Consequências (prós/contras)
```
**PREMORTEM**
```
# PREMORTEM — SPEC-XXX   (momento: kickoff | merge | pré-deploy | manutenção)
## Narrativa do fracasso (livre, 5–10 linhas): "É daqui a 6 meses, falhou grave. O que aconteceu?"
| # | Risco | P(1–5) | I(1–5) | Score | Mitigação preventiva | Contingência | Indicador de alerta | Responsável |
## Veto: Score ≥15 = mitigar antes · ≥20 = BLOQUEADOR de produção
## GO / NO-GO:
```
**HARNESS_RESULTS**
```
# HARNESS — SPEC-XXX — <data>
| Gate | Status | Notas |  (Smoke·Unit·Integration·E2E·Regression·Security·Performance·Deploy)
Resultado: APROVADO | REPROVADO → se reprovar: registrar, chamar Debugger, corrigir, repetir, atualizar STATE
```
**CONTEXT.md / CLAUDE.md curto (ponteiro — anti-inchaço)**
```
# CONTEXT
Antes de agir, leia: 1) DEV_OS_AI_NATIVE.md  2) STATE.md  3) SPEC ativa  4) ADRs relevantes
Regras: não implemente sem SPEC · siga padrões da Seção 9 · atualize STATE · ADR p/ decisão estrutural
· backend pesado → Debugger · feature sensível → Security · premortem se P0/P1 · Harness antes de "pronto" · em dúvida, pare.
```
**PORTFOLIO (dashboard)**
```
# PORTFOLIO — <data>
| Projeto | Classe (P0–P4) | Status | Foco da semana | Risco | Última atualização |
Ativos (máx 3): ...    Manutenção (≤5): ...    Sleep/backlog (resto): ...
```
**HANDOFF (passagem de contexto entre agentes/sessões)**
```
# HANDOFF — <data>  De: <papel> Para: <papel>
## O que foi feito   ## O que falta   ## Decisões/bloqueios   ## Onde continuar (arquivos/SPEC)
```

---

## 11. Portfolio OS (operar muitos projetos sem se afogar)

| Classe | Significado | Ação |
|---|---|---|
| **P0** | Produção, cliente ativo, dinheiro/risco imediato | Atenção diária |
| **P1** | Lançamento próximo ou alto potencial | Sprint ativa |
| **P2** | Importante, sem urgência | Manutenção planejada |
| **P3** | Experimento | Blocos curtos de validação |
| **P4** | Ideia congelada | Sleep mode (estado documentado) |

**Limite operacional:** **no máximo 3 projetos ativos** ao mesmo tempo · ≤5 em manutenção leve · o
resto em sleep/backlog. **Motivo:** o gargalo não é gerar código — é **coordenação, revisão, deploy e
memória**. Mais de 3 frentes pesadas = troca de contexto e bugs de coordenação.

---

## 12. Guardrails Inegociáveis

**Nunca:** apagar memória/estado antigo sem período de estabilidade · mover/reescrever código que
funciona numa primeira migração · trocar deploy junto com reorganização grande · rodar migração de
banco sem rollback · deixar agente alterar variáveis de ambiente sem revisão humana · permitir que o
mesmo agente implemente **e** aprove · operar muitos projetos como ativos ao mesmo tempo.

**Sempre:** registrar decisão estrutural em ADR · atualizar STATE após mudança relevante · rodar
Harness antes de considerar pronto · fazer Premortem em P0/P1 e antes de deploy · manter segredos só
em env · preferir migração por espelho a reescrita · criar backup antes de mexer em algo crítico.

---

## 13. Rituais Operacionais (rotina por momento)

- **Início do dia:** revisão de portfólio · projetos ativos · checar riscos P0 · checar bugs abertos · definir foco do dia.
- **Antes de codar:** `SDD <SPEC-ID>` · `premortem <SPEC-ID>` (se P0/P1) · planejar sprint · checar se exige ADR.
- **Durante código pesado:** acionar Backend · Debugger · Security · Performance · atualizar STATE.
- **Antes de finalizar:** `harness <SPEC-ID>` · checagem de regressão · checagem de padrões · premortem final · deploy check.
- **Fim do dia:** atualizar STATE · sincronizar memória · atualizar dashboards · listar próximas ações.

---

## 14. Checklists

**Início de projeto:** definir stack (ou usar a de referência) → estrutura de pastas → CONTEXT.md
curto → STATE.md → primeira SPEC → premortem de kickoff → ambiente local rodando → primeiro fluxo
ponta a ponta validado.

**Nova feature (ordem de construção):** SPEC → (premortem) → schema/migração → repository → service →
DTOs → controller (com doc) → tipos/contratos → service HTTP (frontend) → hooks → componentes →
página → rota no menu → Harness → STATE.

**Pré-deploy:** premortem de produção (GO/NO-GO) → rollback testado → backup testado → segredos fora
do código/logs → monitoramento e alerta ativos → Harness verde → runbook de incidente acessível →
pelo menos uma pessoa além do dev principal sabe operar.

---

## 15. Guia de Vibecoding (usar LLMs do jeito certo)

**Regras de ouro:** (1) sempre passe este documento como contexto; (2) seja específico no objetivo;
(3) revise TUDO antes de aceitar; (4) corrija desvios imediatamente; (5) uma tarefa por vez.

**System prompt padrão (cole no início):** *"Você segue o DEV OS deste documento. Antes de codar,
produza a SPEC. Não invente libs nem requisitos. Em dúvida, pare e pergunte. Entregue código real no
naming/estrutura da Seção 9 e rode o Harness antes de dizer pronto."*

**Receitas prontas (exemplos):**
- *"Crie o módulo `<nome>` no backend seguindo as camadas da Seção 9.3 (controller fino, service com regra, repository, DTOs validados)."*
- *"Crie a tela de listagem de `<recurso>` com paginação, filtros e estados de loading/erro, seguindo a Seção 9.4."*
- *"Adicione o model `<nome>` ao schema com soft delete, auditoria e filtro de tenant; gere a migração."*
- *"Implemente paginação reutilizável no endpoint `<rota>` com envelope `{ data, meta }`."*

**Anti-patterns a recusar:** aceitar código sem revisar · pedir "faça tudo" em vez de uma tarefa ·
deixar a LLM escolher a stack sozinha sem SPEC · aceitar lib desconhecida · pular o Harness · ignorar
desvio de padrão "porque funcionou".

---

## 16. Adoção Segura (migrar sem quebrar nada)

**Etapa 1 — Construir a estrutura (sem tocar em código):** criar a pasta `_DEV_OS/` fora dos projetos;
criar memória global, papéis, dashboards e templates; criar um `README` explicando o fluxo. **Não
tocar em nenhum código ainda.**

**Etapa 2 — Consolidar gradualmente:** *observar → espelhar → conectar → testar → migrar → padronizar.*
1. **Inventário** (projetos, IDEs, memórias, agentes). 2. **Backup** antes de mexer. 3. **Mapa** (global vs por projeto vs duplicado). 4. **Espelho** (nova estrutura sem mover nada). 5. **Ponte** (referências do novo padrão para o existente). 6. **Piloto** (1 projeto não crítico). 7. **Validação** (fluxo completo SDD→Specialist→Review→Harness→Premortem). 8. **Correção** dos templates. 9. **Rollout** em lotes de 3. 10. **Congelamento** dos P4 em sleep com estado documentado. 11. **Canônico** (marcar o que foi substituído). 12. **Governança** (revisão semanal de portfólio, diária dos P0/P1).

> Regra de ouro da migração: **não apague, não mova código-fonte, não reescreva histórico, não altere
> env/deploy, não rode migração** na primeira passada. Tudo registrado em `MIGRATION_LOG.md`.

---

## 17. Apêndices

### A — Prompts prontos
- **Montar do zero:** *"Você é meu arquiteto sênior AI-native. Monte a estrutura canônica (pastas, STATE, SPEC, ADR, premortem, harness, dashboard de portfólio) seguindo o DEV OS, sem quebrar nada existente — só camada paralela."*
- **Auditar sem modificar:** *"Audite meu setup sem mudar nada. Entregue: o que está certo · duplicado · perigoso · o que quebra se mover · o que vira padrão global · o que fica por projeto · plano incremental · arquivos que NÃO devem ser tocados."*
- **Consolidar sem quebrar:** *"Consolide para o padrão sem quebrar: não apague, não mova código, não reescreva histórico, não altere env/deploy, não rode migração. Backups antes. Prefira referências. Tudo em MIGRATION_LOG.md. Teste em 1 piloto antes de replicar."*
- **Premortem assíncrono:** ver Seção 8.7.

### B — Mapeamento por plataforma (opcional)
| Conceito DEV OS | Onde mora (exemplos) |
|---|---|
| Este documento (contexto global) | arquivo de regras/contexto da ferramenta; ou anexado ao prompt |
| Papéis de agentes | subagentes/agents da ferramenta, ou seções de prompt por papel |
| Rituais | slash commands, snippets ou macros |
| Gates (Harness) | testes automatizados + hooks de pre-commit/CI |
| STATE / SPEC / ADR / PREMORTEM | arquivos `.md` versionados no repositório |

### C — Glossário rápido (para não-técnicos)
**SPEC** — o contrato do que deve ser construído. **STATE** — a foto viva do projeto. **ADR** —
registro de uma decisão e seu porquê. **Premortem** — imaginar o fracasso antes para evitá-lo.
**Harness** — a bateria de testes que prova que funciona. **Gate** — ponto de controle obrigatório.
**DTO** — o "formulário" que define e valida o que entra numa API. **RBAC** — controle de acesso por
papel. **Idempotência** — repetir a operação sem efeito colateral duplicado. **Soft delete** — marcar
como apagado sem remover de fato. **Multi-tenant** — vários clientes isolados na mesma infraestrutura.

---

*Fim do DEV OS. Padrão único, portátil e sem marca — adapte a identidade ao seu contexto; o cerne
permanece. **Spec first. State always updated. Premortem protects. Harness proves. Deploy only when verified.***
