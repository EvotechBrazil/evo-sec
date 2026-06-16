# Premortem em Desenvolvimento de Sistemas com IA
## Um guia prático para equipes que usam Claude Code, Codex, Cursor e outros LLMs

---

> **"Imaginar o fracasso antes que ele aconteça é a única forma honesta de evitá-lo."**
> — adaptado de Gary Klein, criador do método premortem (1989)

---

## Sumário

1. [O que é Premortem](#1-o-que-é-premortem)
2. [Por que o contexto de IA amplifica a necessidade do método](#2-por-que-o-contexto-de-ia-amplifica-a-necessidade-do-método)
3. [O Processo Premortem em 7 Etapas](#3-o-processo-premortem-em-7-etapas)
4. [Taxonomia de Falhas em Projetos com IA](#4-taxonomia-de-falhas-em-projetos-com-ia)
5. [Premortem por Camada do Sistema](#5-premortem-por-camada-do-sistema)
6. [Perguntas-Gatilho por Ferramenta](#6-perguntas-gatilho-por-ferramenta)
7. [Templates Prontos para Uso](#7-templates-prontos-para-uso)
8. [Integração com Fluxo de Desenvolvimento](#8-integração-com-fluxo-de-desenvolvimento)
9. [Anti-Padrões do Premortem com IA](#9-anti-padrões-do-premortem-com-ia)
10. [Estudo de Caso: Agente de Vendas WhatsApp](#10-estudo-de-caso-agente-de-vendas-whatsapp)
11. [Métricas de Qualidade do Premortem](#11-métricas-de-qualidade-do-premortem)
12. [Referências e Leitura Recomendada](#12-referências-e-leitura-recomendada)

---

## 1. O que é Premortem

### Definição

**Premortem** (ou *pre-mortem*) é uma técnica de análise prospectiva criada pelo psicólogo Gary Klein na década de 1980. Diferente do *postmortem* — que analisa o que deu errado *depois* do desastre — o premortem realiza essa análise *antes* do projeto começar ou em momentos críticos durante seu desenvolvimento.

O exercício central é deceptivamente simples:

> **"Imagine que estamos no futuro. O projeto foi concluído. Ele falhou catastroficamente. O que aconteceu?"**

Ao adotar a perspectiva do fracasso como fato consumado, os participantes superam dois vieses cognitivos devastadores para projetos de tecnologia:

- **Otimismo planejado** (*planning fallacy*): a tendência de subestimar tempo, custo e complexidade.
- **Pensamento em grupo** (*groupthink*): a pressão social que silencia vozes dissidentes durante o planejamento.

### Base Cognitiva

Klein descobriu que quando pedimos às pessoas para *imaginar* que algo falhou, em vez de *especular* se pode falhar, a qualidade e quantidade de riscos identificados aumenta em **até 30%**. A distinção é sutil, mas poderosa:

| Abordagem convencional | Abordagem premortem |
|---|---|
| "O que *poderia* dar errado?" | "Isso *já* deu errado. O que aconteceu?" |
| Modo especulativo | Modo narrativo |
| Inibe a voz dos pessimistas | Legitima e recompensa o pessimismo |
| Resultados vagos | Histórias concretas e detalhadas |

---

## 2. Por que o contexto de IA amplifica a necessidade do método

Projetos que incorporam LLMs como Claude, GPT-4o, Gemini, ou ferramentas como Claude Code, Cursor e GitHub Copilot possuem uma categoria própria de riscos que tornam o premortem não apenas útil, mas **essencial**.

### 2.1 Confiança Desproporcional na Saída do Modelo

Desenvolvedores — especialmente os menos experientes — tendem a aceitar código gerado por LLM como correto sem revisão crítica. Isso cria uma **ilusão de competência**: o sistema *parece* funcionar porque o código compila e os testes básicos passam, mas lógicas de negócio sutis estão erradas.

> **Risco específico**: um agente de IA que qualifica leads pode estar fazendo perguntas na ordem errada, perdendo a janela de conversão, sem que nenhum teste automatizado capture isso.

### 2.2 Não-determinismo como Fonte de Bugs Invisíveis

Ao contrário de código tradicional, sistemas com LLM produzem saídas diferentes para entradas idênticas. Isso significa que:

- Bugs são reproduzíveis de forma intermitente
- Falhas em produção não são replicáveis em staging
- Logs mostram "sucesso" na maioria das execuções, mascarando as falhas

### 2.3 Degradação Silenciosa com Mudanças de Modelo

Provedores como Anthropic e OpenAI atualizam modelos continuamente. Um prompt que funcionava perfeitamente com `claude-sonnet-3-5` pode produzir saídas sutilmente diferentes com `claude-sonnet-4-6` sem nenhuma notificação de breaking change.

### 2.4 Custo como Variável Oculta

Custos de API escalam de forma não-linear com uso mal planejado: loops de agentes, context windows superdimensionados, chamadas redundantes e falta de cache podem transformar um sistema de $30/mês em $300/mês overnight.

### 2.5 Complexidade de Sistemas Multi-Agente

Arquiteturas com Supervisor → Sub-agente → Ferramentas possuem pontos de falha em cascata. Uma falha em um nó intermediário pode corromper o estado global de formas difíceis de debugar.

### 2.6 Dependências de Infraestrutura Terceirizada

Sistemas de IA modernos tipicamente dependem de:
- API do provedor de LLM (uptime, rate limits, preços)
- Plataformas de orquestração (n8n, LangGraph, CrewAI)
- Bancos de dados vetoriais ou relacionais (Supabase, Pinecone, Postgres)
- Canais de comunicação (WhatsApp/Evolution API, Slack, email)
- Sistemas de autenticação e CRM externos

Cada dependência é um ponto de falha que poucos times mapeiam adequadamente antes de entrar em produção.

---

## 3. O Processo Premortem em 7 Etapas

### Etapa 0 — Preparação (antes da sessão)

**Duração**: 30 minutos de preparação individual

**O que fazer**:
- Distribuir o documento de escopo/arquitetura do projeto para todos os participantes
- Solicitar que cada pessoa leia e anote **silenciosamente** 3–5 possíveis causas de fracasso
- Garantir que o documento de riscos não seja compartilhado antes da sessão (para evitar ancoragem)

**Participantes ideais**:
- Desenvolvedor(es) do sistema
- Usuário/cliente final ou seu representante
- Alguém de fora do projeto (perspectiva externa)
- Opcionalmente: um "advogado do diabo" designado formalmente

---

### Etapa 1 — Contextualização (5 min)

O facilitador apresenta o projeto de forma concisa:

> "Vamos desenvolver [X]. A arquitetura prevê [Y]. O prazo é [Z]. O sucesso significa [métrica de sucesso]."

Importante: **não apresentar riscos conhecidos** neste momento. O objetivo é partir do zero coletivo.

---

### Etapa 2 — O Salto Temporal (10 min)

O facilitador conduz o exercício de imaginação prospectiva:

> "Agora é [data de conclusão + 6 meses]. O sistema foi ao ar. **Ele falhou de forma grave**. Os usuários estão insatisfeitos, os custos explodiram, ou o sistema foi desligado. Tomem 10 minutos para escrever individualmente: o que aconteceu?"

**Regras desta etapa**:
- Silêncio absoluto — sem discussão
- Escrita livre, sem julgamento
- Não se limitar a falhas "prováveis" — incluir falhas "improváveis mas catastróficas"
- Escrever em primeira pessoa narrativa ("o sistema começou a enviar mensagens duplicadas porque...")

---

### Etapa 3 — Coleta Round-Robin (20–40 min)

Cada participante lê **um item** por vez, em rodadas. O facilitador anota em um quadro compartilhado sem julgamento ou debate. Continua até que todos os itens sejam esgotados.

**Técnica de agrupamento em tempo real**:

| Categoria | Exemplos |
|---|---|
| 🔴 Falhas de Produto | Fluxo errado, experiência do usuário confusa |
| 🟠 Falhas Técnicas | Bugs, race conditions, timeouts |
| 🟡 Falhas de Modelo/IA | Alucinações, prompt drift, degradação |
| 🔵 Falhas de Infraestrutura | Downtime, rate limits, custos |
| 🟣 Falhas de Processo | Falta de monitoramento, deploys sem rollback |
| ⚫ Falhas de Negócio | Premissas erradas sobre o usuário |

---

### Etapa 4 — Priorização (15 min)

Para cada item coletado, a equipe vota em dois eixos:

- **Probabilidade**: 1 (improvável) → 5 (quase certo)
- **Impacto**: 1 (tolerável) → 5 (catastrófico)

**Score de Risco = Probabilidade × Impacto**

Itens com score ≥ 15 entram na lista de riscos críticos e exigem plano de mitigação antes de iniciar o desenvolvimento.

---

### Etapa 5 — Planos de Mitigação (30 min)

Para cada risco crítico (score ≥ 15), a equipe define:

```
RISCO: [descrição]
SCORE: [P × I]
MITIGAÇÃO PREVENTIVA: [o que faremos antes do problema ocorrer]
PLANO DE CONTINGÊNCIA: [o que faremos se o problema ocorrer mesmo assim]
RESPONSÁVEL: [nome]
INDICADOR DE ALERTA: [como saberemos que estamos indo nessa direção]
```

---

### Etapa 6 — Revisão e Comprometimento (10 min)

- Consolidar o documento de riscos
- Cada responsável confirma seu plano
- Definir data de **premortem de revisão** (tipicamente no meio do projeto)
- Incorporar os riscos ao backlog como tarefas de mitigação

---

### Etapa 7 — Premortem Iterativo (contínuo)

O premortem não é um evento único. Recomenda-se repetir o exercício:

- **Ao iniciar** cada fase ou milestone significativo
- **Ao mudar** o provedor de modelo ou versão de LLM
- **Ao escalar** de staging para produção
- **Ao detectar** anomalias em métricas de uso ou custo
- **Mensalmente** para sistemas em produção ativa

---

## 4. Taxonomia de Falhas em Projetos com IA

Esta taxonomia foi construída para uso direto como checklist durante o premortem.

### 4.1 Falhas de Prompt Engineering

| Falha | Descrição | Sinal de alerta |
|---|---|---|
| **Prompt Drift** | O comportamento do modelo muda sutilmente com a mesma versão ao longo do tempo | Respostas ficam menos consistentes sem mudança de código |
| **Instrução Conflitante** | O system prompt contradiz o human turn em casos de borda | Saídas erráticas em entradas específicas |
| **Overfit de Exemplos** | Few-shot examples são muito específicos e o modelo generaliza mal | Bom em testes, ruim em produção |
| **Context Pollution** | Mensagens antigas no histórico corrompem respostas novas | Comportamento piora progressivamente em conversas longas |
| **Jailbreak por Usuário** | Usuário manipula o agente para sair do escopo definido | Logs mostram desvios de persona ou função |
| **Idioma e Localização** | O modelo responde adequadamente em inglês mas falha em pt-BR | Testes apenas em inglês passam, produção em pt-BR falha |

### 4.2 Falhas de Arquitetura

| Falha | Descrição | Sinal de alerta |
|---|---|---|
| **Single Point of Failure** | Um único nó sem fallback derruba o sistema inteiro | Qualquer interrupção = sistema offline |
| **State Loss** | O estado da conversa ou processo se perde entre chamadas | Usuário precisa repetir informações |
| **Loop Infinito de Agente** | O agente chama ferramentas em ciclo sem condição de parada | Custos explodem, resposta nunca chega |
| **Race Condition** | Dois processos paralelos modificam o mesmo recurso | Dados corrompidos intermitentemente |
| **Cascata de Falhas** | Falha em sub-agente derruba Supervisor sem rollback | Sistema para sem mensagem de erro útil |
| **Acoplamento Excessivo** | Mudança em uma parte quebra partes não relacionadas | Deploys pequenos causam regressões inesperadas |

### 4.3 Falhas de Dados e Memória

| Falha | Descrição | Sinal de alerta |
|---|---|---|
| **Alucinação Factual** | O modelo inventa informações de produto, preço ou agenda | Usuários recebem dados incorretos como verdadeiros |
| **RAG com Dados Stale** | Base de conhecimento desatualizada alimenta respostas erradas | Respostas corretas ontem, erradas hoje |
| **Memória Não Persistente** | Conversa perde contexto entre sessões | Usuário sente que está "conversando com um novo bot" |
| **Contaminação de Memória** | Uma conversa influencia indevidamente outra | Dados de um usuário aparecem para outro |
| **Overflow de Context Window** | Histórico ultrapassa o limite e mensagens antigas são cortadas | Agente "esquece" decisões tomadas anteriormente |

### 4.4 Falhas de Custo e Performance

| Falha | Descrição | Sinal de alerta |
|---|---|---|
| **Token Explosion** | Prompts desnecessariamente longos multiplicados por volume | Custo mensal 5–10× acima do esperado |
| **Cache Miss Sistemático** | Sistema não aproveita cache de prompt, recalcula tudo | Latência alta + custo alto sem motivo aparente |
| **Latência Inaceitável** | Resposta demora > 5–10s em casos normais | Usuários abandonam a conversa antes da resposta |
| **Rate Limit em Horário de Pico** | Volume concentrado em certos horários esgota quota | Falhas silenciosas às 18h todo dia |
| **Modelo Superdimensionado** | Uso de Claude Opus para tarefas que o Haiku resolveria | Custo 15× maior sem ganho de qualidade |

### 4.5 Falhas de Integração

| Falha | Descrição | Sinal de alerta |
|---|---|---|
| **API Deprecation** | Provedor depreca endpoint sem aviso suficiente | Sistema para de funcionar após update |
| **Schema Change** | Payload de uma API muda e quebra o parsing | Erros 422/500 começam a aparecer |
| **Webhook Não Confiável** | Mensagens chegam fora de ordem ou duplicadas | Ações executadas duas vezes |
| **Auth Token Expiry** | Token de acesso expira em produção sem renovação automática | Falhas todas as 24h às 00:00 |
| **Timeout Sem Retry** | Chamada falha silenciosamente sem tentativa de recuperação | Dados perdidos sem log de erro |

---

## 5. Premortem por Camada do Sistema

### 5.1 Camada de Interface (WhatsApp, Web, App)

**Perguntas-premortem**:
- O que acontece quando o usuário envia um arquivo que o sistema não espera?
- O que acontece quando o usuário não responde por 24h e depois volta?
- O que acontece quando a mensagem do usuário tem 500 caracteres de texto não estruturado?
- O que acontece quando dois usuários diferentes enviam a mesma mensagem ao mesmo tempo?

**Riscos típicos**:
- Falta de mensagem de fallback para inputs inválidos
- Ausência de timeout com retomada de contexto
- Experiência quebrada em celulares com conexão instável

---

### 5.2 Camada de Orquestração (n8n, LangGraph, CrewAI)

**Perguntas-premortem**:
- O que acontece se o nó de memória falhar antes de salvar o estado?
- O que acontece se o webhook receber a mesma mensagem duas vezes?
- O que acontece se o modelo retornar um JSON malformado?
- Existe um mecanismo de dead-letter queue para mensagens que falham?

**Riscos típicos**:
- Workflows sem tratamento de erro nos nós intermediários
- Ausência de idempotência (reexecução gera efeitos colaterais)
- Variáveis de ambiente hardcoded em vez de secrets gerenciados

---

### 5.3 Camada de LLM (Claude, GPT, Gemini)

**Perguntas-premortem**:
- O que acontece quando o modelo atinge o max_tokens e corta a resposta?
- O que acontece quando o modelo retorna conteúdo vazio ou recusa a solicitação?
- O que acontece quando o modelo é atualizado pelo provedor sem aviso?
- Os testes cobrem saídas edge-case ou apenas o caminho feliz?

**Riscos típicos**:
- Nenhum mecanismo de validação da saída do modelo
- Dependência implícita de comportamento específico de versão
- Ausência de fallback para modelo alternativo em caso de downtime

---

### 5.4 Camada de Dados (Supabase, PostgreSQL, Redis)

**Perguntas-premortem**:
- O que acontece se o banco ficar offline por 5 minutos durante pico de uso?
- O que acontece se a query retornar null onde o sistema espera um valor?
- Existe estratégia de backup testada para dados de produção?
- As migrations foram testadas com dados reais de volume?

**Riscos típicos**:
- Conexões de banco não liberadas (connection pool exhaustion)
- Ausência de índices em colunas de alta consulta
- Migrações reversíveis não planejadas

---

### 5.5 Camada de Infraestrutura (VPS, Docker, DNS)

**Perguntas-premortem**:
- O que acontece se o VPS reiniciar às 2h da manhã?
- Existe monitoramento com alerta ativo, não apenas dashboard passivo?
- O processo de deploy tem rollback testado?
- Os logs estão sendo retidos por quanto tempo? São suficientes para debugar?

---

## 6. Perguntas-Gatilho por Ferramenta

### Claude Code / Cursor / Copilot (ferramentas de codificação com IA)

```markdown
PREMORTEM CHECKLIST — GERAÇÃO DE CÓDIGO COM LLM

[ ] O código gerado foi revisado linha a linha por um desenvolvedor humano?
[ ] Existe lógica de negócio crítica que foi gerada pelo modelo sem validação manual?
[ ] Os testes foram escritos pelo humano ou pelo modelo? (cuidado: modelo tende a testar
    o que ele mesmo implementou, não o que deveria ser testado)
[ ] Existem padrões de segurança (injeção SQL, XSS, auth bypass) que o modelo pode
    ter ignorado?
[ ] O código depende de bibliotecas desconhecidas sugeridas pelo modelo?
[ ] Existe alguma "mágica" no código que ninguém da equipe consegue explicar?
[ ] O modelo foi usado para gerar migrations de banco de dados? Foram revisadas?
[ ] O código gerado tem cobertura de testes adequada para casos de borda?
```

### Agentes Conversacionais (Claude, GPT como chatbots/assistentes)

```markdown
PREMORTEM CHECKLIST — AGENTES CONVERSACIONAIS

[ ] O agente tem um fallback claro para quando não sabe a resposta?
[ ] O agente pode ser manipulado a sair do seu escopo definido?
[ ] O histórico de conversa tem limite e limpeza adequados?
[ ] Existe logging suficiente para auditar o que o agente disse a um usuário específico?
[ ] O agente pode confirmar ações irreversíveis (agendamentos, pagamentos)?
[ ] O que acontece quando o usuário envia input em idioma diferente do esperado?
[ ] Existe rate limiting por usuário para evitar abuso?
[ ] O agente lida corretamente com usuários abusivos ou com intent malicioso?
[ ] Como o agente se comporta em dias de alta demanda (Black Friday, lançamentos)?
```

### Sistemas RAG (Retrieval-Augmented Generation)

```markdown
PREMORTEM CHECKLIST — SISTEMAS RAG

[ ] A base de conhecimento tem processo definido de atualização?
[ ] Existe validação de que o modelo está usando a informação recuperada, não
    "inventando" além dela?
[ ] O sistema de embedding foi testado com queries reais de usuário, não apenas
    queries de teste criadas por desenvolvedores?
[ ] Existe score de confiança e limiar de relevância configurado?
[ ] O que acontece quando a query não tem correspondência na base?
[ ] Documentos contraditórios na base foram tratados?
[ ] A estratégia de chunking foi validada para o tipo de conteúdo do negócio?
```

### Pipelines de Automação com IA (n8n, Make, Zapier + LLM)

```markdown
PREMORTEM CHECKLIST — PIPELINES DE AUTOMAÇÃO

[ ] Todos os nós críticos têm tratamento de erro explícito?
[ ] O pipeline é idempotente (pode ser reexecutado sem efeitos colaterais)?
[ ] Existe mecanismo de alertas para falhas silenciosas?
[ ] As credenciais são gerenciadas como secrets, não hardcoded?
[ ] O pipeline foi testado com volume 10× maior que o esperado?
[ ] Existe documentação de como reiniciar manualmente em caso de falha?
[ ] Os webhooks têm verificação de assinatura/autenticação?
[ ] Existe processo de rollback para o estado anterior em caso de falha?
```

---

## 7. Templates Prontos para Uso

### Template 1: Premortem de Kickoff de Projeto

```markdown
# PREMORTEM — [Nome do Projeto]
**Data**: _______________
**Participantes**: _______________
**Facilitador**: _______________
**Escopo do projeto**: _______________

---

## NARRATIVA DO FRACASSO

> "É [data + 6 meses]. O projeto foi ao ar mas falhou gravemente.
> Escreva o que aconteceu (narrativa livre, 5–10 linhas):"

**[Participante 1]:**
_______________________________________________

**[Participante 2]:**
_______________________________________________

**[Participante 3]:**
_______________________________________________

---

## RISCOS IDENTIFICADOS

| # | Risco | Probabilidade (1–5) | Impacto (1–5) | Score | Responsável |
|---|-------|--------------------|--------------|----|-------------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

---

## PLANOS DE MITIGAÇÃO (Score ≥ 15)

### Risco #__: _______________
- **Mitigação preventiva**: _______________
- **Plano de contingência**: _______________
- **Indicador de alerta**: _______________
- **Responsável**: _______________
- **Prazo**: _______________

---

## COMPROMETIMENTOS

- [ ] Riscos críticos inseridos no backlog
- [ ] Data do próximo premortem: _______________
- [ ] Documento revisado por todos os participantes
```

---

### Template 2: Premortem de Deploy para Produção

```markdown
# PREMORTEM DE PRODUÇÃO — [Sistema]
**Deploy previsto**: _______________
**Versão**: _______________

---

## CENÁRIOS DE FALHA PÓS-DEPLOY

Para cada cenário abaixo, marque se está coberto:

### Performance e Custo
[ ] Custo de tokens na primeira semana dentro do orçamento esperado
[ ] Latência mediana < ___ ms sob carga normal
[ ] Sistema funciona com 2× o volume esperado no lançamento

### Confiabilidade
[ ] Rollback pode ser executado em < 10 minutos
[ ] Todas as dependências externas têm SLA monitorado
[ ] Alertas configurados e testados (não apenas criados)

### Dados e Segurança
[ ] Backup de produção testado e documentado
[ ] Dados sensíveis de usuário não aparecem em logs
[ ] Autenticação e autorização validadas com testes de penetração básicos

### Operação
[ ] Runbook de incidente criado e acessível à equipe
[ ] Monitoramento ativo com canal de alertas configurado
[ ] Pelo menos uma pessoa além do desenvolvedor principal sabe operar o sistema

---

## APROVAÇÃO PARA DEPLOY

| Critério | Status | Responsável |
|----------|--------|-------------|
| Todos os riscos críticos mitigados | ✅/❌ | |
| Ambientes de staging e produção equivalentes | ✅/❌ | |
| Rollback testado | ✅/❌ | |
| Monitoramento ativo | ✅/❌ | |

**GO / NO-GO**: _______________
```

---

## 8. Integração com Fluxo de Desenvolvimento

### 8.1 Premortem no Ciclo de Sprints

```
Sprint Planning
    │
    ▼
╔══════════════════╗
║  PREMORTEM       ║  ← 30 min ao início de cada sprint com nova feature significativa
║  DE SPRINT       ║     Foco: o que pode quebrar nesta sprint?
╚══════════════════╝
    │
    ▼
Desenvolvimento + Code Review com LLM
    │
    ▼
╔══════════════════╗
║  PREMORTEM       ║  ← 15 min antes de cada merge para main
║  DE MERGE        ║     Foco: que efeito colateral isso pode ter?
╚══════════════════╝
    │
    ▼
Staging
    │
    ▼
╔══════════════════╗
║  PREMORTEM       ║  ← 45 min antes de cada deploy para produção
║  DE PRODUÇÃO     ║     Foco: o que pode falhar nas primeiras 24h?
╚══════════════════╝
    │
    ▼
Produção
    │
    ▼
╔══════════════════╗
║  PREMORTEM       ║  ← Mensal
║  DE MANUTENÇÃO   ║     Foco: o que pode se deteriorar silenciosamente?
╚══════════════════╝
```

### 8.2 Premortem como Gate de Pull Request

Para projetos com IA, adicionar ao template de PR:

```markdown
## Premortem Rápido (obrigatório para features de IA)

**Qual é o pior cenário se este código for para produção com um bug?**
_______________________________________________

**Esta mudança pode afetar o custo de tokens? Como?**
_______________________________________________

**Como saberemos se este código está falhando silenciosamente em produção?**
_______________________________________________

**Existe rollback claro se precisarmos reverter?**
_______________________________________________
```

### 8.3 Premortem Assíncrono com LLM

Uma técnica poderosa: usar o próprio LLM como participante do premortem.

**Prompt para premortem com Claude**:

```
Você é um arquiteto sênior de sistemas de IA com 15 anos de experiência, 
especializado em falhas de produção. Tenho um projeto com a seguinte arquitetura:

[DESCRIÇÃO DO SISTEMA]

Assuma que este sistema foi colocado em produção e falhou gravemente 
em 6 meses. Gere:

1. As 10 causas mais prováveis de falha, rankeadas por probabilidade × impacto
2. Para cada causa: um sinal de alerta precoce que deveria ter sido monitorado
3. As 3 falhas mais improváveis mas com impacto catastrófico que geralmente 
   são ignoradas no planejamento
4. Uma lista de perguntas que o time de desenvolvimento deveria ser capaz de 
   responder ANTES do deploy, mas provavelmente não consegue

Seja brutalmente honesto. Não minimize os riscos.
```

---

## 9. Anti-Padrões do Premortem com IA

### ❌ "O modelo validou, então está correto"

**O problema**: LLMs frequentemente confirmam o que o usuário quer ouvir (*sycophancy*). Pedir ao Claude Code para "revisar se meu código está correto" tende a receber "sim, parece correto" mais frequentemente do que merece.

**A solução**: Pedir especificamente ao modelo que assuma o papel de adversário: "Assuma que este código tem pelo menos 3 bugs graves. Encontre-os."

---

### ❌ Premortem apenas no kickoff, nunca revisado

**O problema**: O primeiro premortem captura riscos com as informações disponíveis naquele momento. Conforme o projeto evolui, surgem novos riscos — especialmente em sistemas de IA onde o comportamento emergente é difícil de prever.

**A solução**: Calendar blocking para premortems de revisão a cada milestone.

---

### ❌ Premortem sem poder de veto real

**O problema**: O premortem vira teatro corporativo quando os riscos são documentados mas não há mecanismo real para pausar o projeto.

**A solução**: Estabelecer explicitamente que qualquer risco com score ≥ 20 é um bloqueador para produção, não apenas uma nota.

---

### ❌ Confundir premortem com gestão de riscos convencional

**O problema**: A gestão de riscos convencional pede "liste os riscos". O premortem pede "narre o fracasso". A diferença é psicológica mas fundamental: a narrativa ativa partes do cérebro ligadas à memória episódica, gerando insights que listas não geram.

**A solução**: Insistir na escrita narrativa, não em bullets. "O sistema parou de funcionar porque..." não "Risco de downtime".

---

### ❌ Ignorar o feedback do usuário final

**O problema**: Desenvolvedores imaginam usuários técnicos usando o sistema de forma racional. Usuários reais são imprevisíveis, cometem erros, testam limites e têm contextos emocionais que afetam a interação.

**A solução**: Incluir um representante de usuário real (ou persona detalhada) em cada sessão de premortem.

---

### ❌ Premortem sem métricas de acompanhamento

**O problema**: Identificar riscos é inútil sem saber se as mitigações estão funcionando.

**A solução**: Para cada risco crítico, definir um KPI ou log metric que confirme que o risco não está se materializando.

---

## 10. Estudo de Caso: Agente de Vendas WhatsApp

Este estudo de caso ilustra como aplicar o premortem em um agente conversacional de qualificação de leads via WhatsApp, usando n8n + Claude + Supabase.

### Contexto do Projeto

- **Sistema**: Agente SDR (Sales Development Representative) automatizado
- **Canal**: WhatsApp via Evolution API
- **Função**: Qualificar leads, coletar dados, agendar visitas
- **Volume esperado**: 150 conversas/mês
- **Custo estimado**: $30 USD/mês

---

### Sessão de Premortem — Narrativas Coletadas

**Narrativa 1** (desenvolvedor):
> "Após 3 semanas em produção, percebemos que o agente estava enviando a mensagem de agendamento sem verificar se o horário ainda estava disponível na agenda. Leads receberam confirmações de horários já ocupados. A credibilidade do negócio foi destruída em menos de uma semana."

**Narrativa 2** (dono do negócio):
> "O agente começou a responder mensagens em inglês quando leads digitavam em espanhol. Como a cidade tem muitos imigrantes, perdemos um segmento inteiro sem perceber."

**Narrativa 3** (designer de experiência):
> "O agente sempre fazia 7 perguntas antes de qualquer informação relevante. Leads respondiam as 2 primeiras e desistiam. Taxa de conversão foi 3%, metade do esperado."

**Narrativa 4** (externo ao projeto):
> "Um concorrente percebeu o padrão do agente e começou a submeter leads falsos sistematicamente, inflando o custo de API e contaminando a base de dados de leads com dados inválidos."

---

### Matriz de Riscos Resultante

| Risco | P | I | Score | Mitigação |
|-------|---|---|-------|-----------|
| Agendamento sem verificação de disponibilidade | 4 | 5 | **20** | Verificar disponibilidade antes de confirmar; mensagem de "aguarde confirmação" |
| Taxa de abandono de conversa > 50% | 4 | 4 | **16** | A/B test de fluxo com máximo 3 perguntas iniciais; entregar valor antes de coletar |
| Custo acima do orçamento | 3 | 4 | **12** | Hard limit de tokens/dia + alerta ao atingir 80% do orçamento |
| Resposta em idioma errado | 3 | 3 | **9** | Detecção automática de idioma no primeiro turn |
| Leads falsos / abuso de API | 2 | 4 | **8** | Rate limiting por número + validação de formato dos dados coletados |
| Downtime do Evolution API | 2 | 5 | **10** | Monitoramento de uptime + fila de mensagens com retry |

---

### Mitigações Implementadas pré-Produção

Com base no premortem, as seguintes decisões foram tomadas **antes** do primeiro lead real:

1. **Verificação de disponibilidade em tempo real** antes de qualquer confirmação de horário
2. **Fluxo reformulado**: primeiro entregar valor (resposta à dúvida inicial), depois coletar dados
3. **Dashboard de custo** com alertas em 50%, 80% e 100% do orçamento mensal
4. **Context window limitado a 10 mensagens** para controlar token usage
5. **Wait node de 2 segundos** antes do Supervisor para evitar race conditions em respostas rápidas
6. **Logs de conversa completos** no Supabase para auditoria e debugging

---

## 11. Métricas de Qualidade do Premortem

Como saber se seu premortem foi eficaz?

### Métricas do Processo

| Métrica | Referência saudável |
|---------|-------------------|
| Número de riscos identificados por participante | ≥ 3 por pessoa |
| % de riscos em categoria técnica vs. negócio | Distribuição equilibrada (foco excessivo em técnico é sinal de viés) |
| % de riscos com plano de mitigação definido | 100% para score ≥ 15 |
| Tempo até o próximo premortem de revisão | ≤ 30 dias para projetos ativos |

### Métricas de Resultado

| Métrica | O que indica |
|---------|-------------|
| % de incidentes de produção que foram previstos no premortem | > 70% = premortem eficaz |
| Custo real vs. custo estimado pós-premortem | Desvio < 20% = estimativas melhoradas |
| Tempo médio para resolver incidentes | Deve cair após premortems regulares |
| Número de "surpresas" em produção por trimestre | Deve diminuir progressivamente |

---

## 12. Referências e Leitura Recomendada

### Fundamentos do Método

- **Klein, G. (2007)**. *Performing a Project Premortem*. Harvard Business Review, set. 2007.
  > Artigo original que popularizou o conceito no mundo corporativo.

- **Kahneman, D. (2011)**. *Thinking, Fast and Slow*. Farrar, Straus and Giroux.
  > Capítulos sobre planning fallacy e outside view são a base cognitiva do premortem.

- **Taleb, N.N. (2007)**. *The Black Swan*. Random House.
  > Enquadramento dos riscos de baixa probabilidade e alto impacto — especialmente relevante para sistemas de IA.

### Engenharia de Sistemas Confiáveis

- **Google SRE Team (2016)**. *Site Reliability Engineering*. O'Reilly Media.
  > Capítulos sobre postmortems e error budgets são complementares ao premortem.

- **Kleppmann, M. (2017)**. *Designing Data-Intensive Applications*. O'Reilly Media.
  > Base para premortems de camada de dados.

### Riscos Específicos de IA

- **Anthropic (2024)**. *Model Card — Claude 3 Family*.
  > Documentação de limitações e comportamentos conhecidos dos modelos.

- **Weidinger, L. et al. (2022)**. *Taxonomy of Risks posed by Language Models*. FAccT '22.
  > Taxonomia acadêmica de riscos de LLMs, útil para enriquecer sessões de premortem.

- **Bommasani, R. et al. (2021)**. *On the Opportunities and Risks of Foundation Models*. Stanford CRFM.
  > Análise abrangente de riscos sistêmicos de modelos de fundação.

### Ferramentas Complementares

- **FMEA (Failure Mode and Effects Analysis)**: análise estruturada de modos de falha, complementar ao premortem para sistemas com componentes de hardware ou processos regulatórios
- **Chaos Engineering** (Netflix Chaos Monkey): teste ativo de falhas em vez de apenas imaginação preventiva
- **Red Team Exercises**: versão adversarial do premortem, onde um time tenta ativamente quebrar o sistema

---

## Apêndice: Glossário de Termos

| Termo | Definição no contexto deste documento |
|-------|--------------------------------------|
| **Premortem** | Análise prospectiva de falhas antes do projeto iniciar |
| **Prompt Drift** | Mudança gradual no comportamento do modelo sem alteração de código |
| **Context Pollution** | Degradação da qualidade das respostas por histórico de conversa acumulado |
| **Idempotência** | Propriedade de uma operação que produz o mesmo resultado se executada múltiplas vezes |
| **Dead-letter Queue** | Fila de mensagens que falharam, aguardando revisão manual |
| **Sycophancy** | Tendência do LLM a concordar com o usuário em vez de corrigir erros |
| **RAG** | Retrieval-Augmented Generation — técnica de recuperar documentos para enriquecer o contexto do LLM |
| **Score de Risco** | Probabilidade × Impacto, usado para priorizar riscos |
| **Planning Fallacy** | Viés cognitivo de subestimar o tempo e custo de projetos futuros |
| **Black Swan** | Evento de baixa probabilidade, alto impacto e difícil de prever ex-ante |

---

*Documento gerado para uso em projetos de desenvolvimento de sistemas com IA.*
*Versão 1.0 — Junho 2026*
*Adaptado para contexto de automações com n8n, Claude, WhatsApp e stacks similares.*
