SPEC-ID: SPEC-003
Nome: Módulo Financeiro Completo (caixa + contas a pagar/receber + baixa + Nina inteligente + app mobile)
Projeto: evo-sec
Prioridade: P1
Status: draft

## Objetivo de negócio
Transformar o controle financeiro da Nina de "anotações soltas" em um **módulo de caixa de verdade**. O dono lança entradas/saídas e contas a pagar/receber — pelo WhatsApp/voz **ou** direto no app (sem depender de mensagem) — dá **baixa** nos títulos conforme paga/recebe, e ao perguntar **"qual meu saldo?"** recebe a resposta correta. A Nina passa a entender dinheiro com rigor (categorias, regime de caixa, DRE simples, alerta de DAS/MEI), virando copiloto financeira — não um bloco de notas.

> Motivação: teste real de 22/06/2026. O dono mandou "anota entrada de R$ 250", "saída de 150 (mão de obra)", "a mão de obra foi paga hj", "qual o meu saldo?". A Nina jogou tudo em **recado**, não ligou "foi paga" a uma baixa e respondeu **"não tenho acesso ao seu saldo"**.
> Base de conhecimento contábil: `docs/skills-contadores/` (skills ASV/Bravy auditadas; plano de contas, regime de caixa, DRE gerencial, fluxo projetado, MEI/DAS, conciliação) — referência local, gitignored pela licença.

## Usuário afetado
Rodrigo (1º tenant, MEI/pequeno negócio) e contas futuras. Multi-tenant: cada um só vê o próprio dinheiro.

## Problema
A informação financeira hoje é capturada como texto solto. Faltam: (a) ação de **lançamento de caixa** (entrada/saída avulsa) — por isso "entrada de R$ 250" virou recado; (b) ligação de linguagem natural ("foi paga") com **baixa de título**; (c) ação de **consulta** (saldo, pendências) — o backend calcula em `GET /financeiro/fluxo`, mas o cérebro nunca chama; (d) **entrada manual no app** — a tela `/financeiro` é só leitura. Resultado: a Nina não fecha o ciclo lançar → categorizar → baixar → consultar.

## Resultado esperado
1. **Modelo unificado (Opção A)**: a tabela `Conta` cobre **título** (com vencimento, nasce PENDENTE) **e** **movimentação avulsa** (nasce paga, vencimento = hoje), distinguidos por `origem`. Saldo = soma do que está PAGO/RECEBIDO. Uma fonte de verdade, sem duplicar dinheiro.
2. **Categorização** com plano de contas enxuto: tabela `Categoria` tenant-scoped, seedada do conhecimento contábil; cada categoria carrega a **natureza p/ DRE**.
3. **Cérebro da Nina** entende: lançar entrada/saída, criar conta a pagar/receber, **dar baixa por descrição**, **consultar saldo**, listar pendências — no WhatsApp (n8n) **e** na voz (API), com a **mesma lógica** (reusa `FinanceiroService`).
4. **Confirmação por botões/cards**: antes de gravar, a Nina manda um card com botões (WhatsApp via Evolution; app via card) pra confirmar/corrigir o tipo — mata a ambiguidade que virou recado.
5. **App mobile**: criar/editar/baixar lançamentos **direto via REST** (sem WhatsApp), painel de saldo/fluxo, DRE do mês e donut por categoria, no tema preto+amarelo.
6. **Inteligência fiscal MEI/Simples** (incremento): alerta de DAS a vencer (dia 20) e faturamento perto do limite anual.

## Fora de escopo (agora)
- Integração bancária real / Open Finance / importação OFX automática (conciliação fica manual; fase futura).
- Contabilidade fiscal (ECD/ECF/SPED, apuração de imposto) — as skills cobrem, mas é trabalho de contador, não da Nina.
- Depreciação, provisão de férias/13º, regime de competência (usamos **caixa**).
- Múltiplas carteiras/contas bancárias com extrato individual (a tabela separada que decidimos **não** fazer).
- Baixa parcial com múltiplos pagamentos — Fase 2 (tabela `Pagamento`).

## Arquitetura (desacoplado / modular / manutenível)
- **Núcleo único de regra**: toda lógica vive em `FinanceiroService` + repositórios. Os 3 consumidores — **REST (app)**, **NinaService (WhatsApp/voz)** e **ResumoService (digest)** — apenas chamam o service. Zero duplicação de regra (mesmo padrão que o `NinaModule` já usa).
- **Canal desacoplado da intenção**: o `/nina/mensagem` devolve uma **intenção + opções de confirmação** (estrutura neutra). Quem renderiza botões é o canal (n8n→Evolution, ou app→card). Adicionar/trocar canal não toca a regra.
- **Categorias como dado, não código**: tabela `Categoria` (seed editável) em vez de enum hard-coded → nova categoria é dado, não deploy.
- **Camadas**: controller fino → service → repository; DTOs com class-validator; dinheiro em centavos inteiros; `tenantId` em toda query; soft delete.

## Modelo de dados (Opção A — estender `Conta`)
- `Conta` ganha:
  - `origem: ContaOrigem` (enum **AVULSO** | **TITULO**) — avulso = caixa do dia; título = obrigação com vencimento.
  - `categoriaId: uuid?` → FK p/ `Categoria` (substitui o `categoria: String?` livre; manter a coluna antiga até backfill).
- Nova `Categoria` `{ id, tenantId, nome, tipo (RECEITA|DESPESA), grupoDre (VENDA|CUSTO_DIRETO|DESPESA_FIXA|PESSOAL|TRIBUTO|FINANCEIRO|EXTRAORDINARIA), isSystem, ativo, createdAt, updatedAt, deletedAt }`.
- (Fase 2) `Pagamento` `{ id, tenantId, contaId, valorCentavos, pagoEm, meio }` p/ baixa parcial.
- `ConfiguracaoNegocio` (estende `Config`): `regime (MEI|SIMPLES|OUTRO)`, `dasValorCentavos`, `dasDiaVencimento`, `faturamentoLimiteAnualCentavos`, `alertaLimitePct`.

## Cérebro da Nina — novas ações (prompt + switch; manter API e n8n em sincronia)
- `registrar_movimentacao` `{ tipo: ENTRADA|SAIDA, valorCentavos, descricao, categoria?, data? }` → `Conta` origem=AVULSO, status já PAGO/RECEBIDO.
- `criar_conta` (já existe) — melhorar: inferir tipo/categoria; exigir/sugerir vencimento.
- `dar_baixa` `{ busca }` (evolui `pagar_conta`) — casa "a mão de obra foi paga" com a conta certa; confirma antes.
- `consultar_saldo` `{ periodo? }` → `fluxoCaixa`, texto pronto.
- `consultar_contas` `{ tipo?, status? }` → lista pendências/atrasados.
- Toda ação de **gravação** passa pelo card de confirmação.

## Confirmação por botões/cards
- `/nina/mensagem` retorna, além de `resposta`/`pendente`, um `confirmacao?` `{ titulo, resumo, opcoes: [{ id, label, estilo, acao, dados }] }`.
- n8n: nó que, havendo `confirmacao`, envia Evolution **buttons** (até 3) no lugar do texto; o clique volta como `pendente` → executa.
- App: componente `<ConfirmCard>` renderiza as opções; o clique chama o endpoint de confirmação.
- Exemplo: *"Entendi: **Conta a receber** R$ 250 — confirmar?"* → [✅ Confirmar] [✏️ É entrada avulsa] [🗒️ Era recado].

## App mobile (REST direto, sem WhatsApp)
- API client ganha `fetchCriarConta`, `fetchAtualizarConta`, `fetchBaixarConta`, `fetchCategorias`, `fetchResumoFinanceiro`.
- Telas: lançamento rápido (FAB entrada/saída), form conta a pagar/receber, lista com filtro (tipo/status/categoria), ação "dar baixa", painel saldo+fluxo, DRE do mês, donut por categoria.
- Reusa design system (Card, Kpi, Donut, Pill, Progress), tema preto+amarelo, mobile-first.

## Critérios de aceite
**Backend / modelo**
- [ ] Migração adiciona `Conta.origem`, `Conta.categoriaId` e a tabela `Categoria` (tenant-scoped, soft delete) **sem quebrar dados existentes** (SPEC-001/002 seguem passando).
- [ ] Seed cria as categorias-base (plano de contas enxuto) marcadas `isSystem`, por tenant; o tenant pode criar/editar/desativar as próprias.
- [ ] Lançamento avulso: `POST /financeiro/contas` com `origem=AVULSO` nasce PAGO/RECEBIDO e entra no saldo no mesmo dia.
- [ ] Título: `POST /financeiro/contas` com vencimento nasce PENDENTE; `POST /financeiro/contas/:id/pagar` faz a baixa (status→PAGO/RECEBIDO, `pagoEm`).
- [ ] `GET /financeiro/fluxo` e novo `GET /financeiro/resumo` retornam saldo/entradas/saídas + DRE por grupo + breakdown por categoria, em centavos, tenant-scoped.
- [ ] Dinheiro sempre inteiro de centavos; toda query filtra `tenantId`; **teste de isolamento cross-tenant passa**.

**Cérebro Nina** (as 5 frases do teste real)
- [ ] "anota entrada de R$ 250" → registra movimentação **ENTRADA** (não recado), via card de confirmação.
- [ ] "saída de 150 mão de obra" → movimentação **SAIDA** com categoria inferida, confirmada.
- [ ] "a mão de obra foi paga hoje" → encontra a conta e **dá baixa** (não vira recado).
- [ ] "qual o meu saldo?" → responde o saldo real (de `fluxoCaixa`), **não** "não tenho acesso".
- [ ] "o que tenho a pagar essa semana?" → lista contas a pagar pendentes/vencendo.
- [ ] As mesmas frases funcionam no **WhatsApp (n8n)** e na **voz (API)** com resultado equivalente.

**Confirmação**
- [ ] Toda ação de gravação dispara `confirmacao` com opções; **nada é gravado antes** do clique/sim.
- [ ] WhatsApp recebe botões (Evolution) e o clique executa a ação correta; **fallback texto** ("responda 1/2/3") se botões indisponíveis.
- [ ] App renderiza `<ConfirmCard>` e confirma via REST.

**App mobile**
- [ ] Criar/editar/baixar lançamento direto no app (sem WhatsApp), refletindo no saldo na hora.
- [ ] Tela mostra saldo, fluxo, DRE do mês e donut por categoria, tema preto+amarelo, mobile-first.
- [ ] Sem `any` público; type-check + lint + boundaries limpos.

## Casos de borda
- "entrada de 250" sem categoria → Nina sugere/pergunta categoria no card (não trava).
- Duas contas "mão de obra" abertas → Nina lista e pede qual baixar (não baixa errado).
- Saldo negativo → mostra negativo, não bloqueia (alerta opcional).
- Baixar conta já paga → idempotente, avisa "já estava paga".
- Movimentação avulsa **não** aparece como "a vencer" (origem=AVULSO já paga).
- Timezone `America/Sao_Paulo` p/ "hoje"/"essa semana".
- Migração: contas antigas com `categoria` string → mapear p/ `Categoria` ou manter string até recategorizar.
- Botões do WhatsApp: cliente sem suporte → fallback "responda 1/2/3".

## Requisitos técnicos
- Backend: **evoluir** `FinanceiroModule` (não reescrever); `NinaModule` ganha as ações **reusando** `FinanceiroService`; `Categoria` (controller+service+repo). Prisma migração + seed. DTOs validados.
- Frontend: novas chamadas REST + telas/forms (react-hook-form + zod), reuso de componentes.
- n8n: ajustar prompt/orquestrador + nó de envio com **botões Evolution** (credencial na UI + Publish — limitação conhecida do STATE).
- Dinheiro em centavos; `requireTenantId()`; soft delete; sem `any` público; ~500 LOC/arquivo.

## Riscos
- **Vazamento entre tenants** (dinheiro de A vira de B) → teste de isolamento cross-tenant + RLS camada 2 (ADR-006).
- **Classificação errada** (entrada virar recado de novo) → o card de confirmação é a mitigação principal; + testes de intent com frases reais.
- **Migração de `categoria` string** → aditiva, sem perder dado; coluna antiga mantida até backfill.
- **Divergência n8n × API** (dois cérebros) → catálogo único de ações documentado; E2E nos dois canais.
- **Escopo inchar** → fases (MVP primeiro; DRE avançada/fluxo projetado/conciliação/alertas fiscais/baixa parcial na Fase 2).
- **Decisão estrutural** (estender `Conta` + `Categoria`) → registrar em **ADR-007** (modelagem financeira).

## Agentes necessários
Backend (Financeiro/Nina/Categoria) · Frontend (telas mobile + `<ConfirmCard>`) · n8n (prompt + botões) · Security/Standards (isolamento, sem `any`, LOC) · DBA (migração + índices + seed).

## Harness necessário
- **Unit**: cálculo de saldo/DRE; mapeamento categoria→grupo DRE; parser das intents financeiras.
- **Integration**: CRUD conta (avulso/título), baixa, resumo; isolamento cross-tenant.
- **E2E**: as 5 frases do teste real (entrada, saída, baixa, saldo, pendências) nos dois canais; criar+baixar no app.
- **Security**: cross-tenant no financeiro; garantir que a confirmação não grava sem consentimento.
- **Regression**: SPEC-001/002 (digest lê `Conta`) seguem verdes.

## Premortem obrigatório: sim

## Decisões travadas (2026-06-22)
1. **Opção A** — `Conta` unificada (origem AVULSO|TITULO); sem tabela de movimentação separada agora.
2. **Categoria como tabela** tenant-scoped (seed editável) — não enum.
3. **Confirmação por botões** (WhatsApp Evolution) + **cards** (app); backend devolve intenção+opções neutras.
4. **Núcleo único** `FinanceiroService` reusado por REST, Nina e Digest (desacoplado).
5. **Fases**: MVP (lançar/categorizar/baixar/saldo/consultar + confirmação + telas) → Fase 2 (DRE avançada, fluxo projetado, conciliação manual, alertas MEI/DAS, baixa parcial).
6. Conhecimento contábil de referência em `docs/skills-contadores/` (auditado; gitignored pela licença).
