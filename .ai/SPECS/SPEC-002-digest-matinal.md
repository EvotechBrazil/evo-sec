SPEC-ID: SPEC-002
Nome: Digest matinal + semanal da Nina (resumo proativo no WhatsApp)
Projeto: evo-sec
Prioridade: P2
Status: draft

## Objetivo de negócio
A Nina deixa de ser só reativa e passa a **entregar um resumo proativo** do que importa: toda manhã (diário) e toda sexta (semanal), o tenant recebe no WhatsApp privado um digest do estado da sua operação pessoal — o que vence hoje, tarefas atrasadas, compromissos do dia, VIPs com recado em aberto, contas a pagar. O dono "lê com o café" em vez de garimpar o app.

> Inspiração: skill `relatorio-diario` (Bravy/Bonus 9) — adaptada da arquitetura batch-CSV deles para a nossa (dados já no Postgres, canal Evolution API, classificação via LLM e não keyword-matching).

## Usuário afetado
Rodrigo (1º tenant) e contas futuras. Cada tenant recebe **só os próprios dados** no **próprio número**.

## Problema
Hoje a informação existe (recados, tarefas, lembretes, agenda, vencimentos no Postgres) mas exige o usuário **abrir o app e procurar**. Vencimento esquecido, VIP sem resposta e tarefa atrasada só aparecem se ele for atrás. Não há visão consolidada nem proativa.

## Resultado esperado
1. Endpoints tenant-scoped `GET /resumo/diario` e `GET /resumo/semanal` que retornam o digest **estruturado (JSON)** e uma versão **texto pronta pro WhatsApp** (`<2.000` chars diário, `<4.000` semanal).
2. Workflow n8n agendado (Schedule) que chama os endpoints e envia via Evolution `sendText` no privado do tenant — diário 7h45 (seg–sex), semanal sexta 17h.
3. Helpers de formatação WhatsApp-friendly portados pra TS (sparkline, setinha ▲▼▬, fmt de duração).

## Fora de escopo
- **Não** enviar nada ao cliente final/terceiros — digest é só pro dono (igual restrição da skill original).
- **Não** medir/cobrar "time" ou atendentes (a Nina é secretária pessoal, não tem equipe).
- Telas de dashboard pro digest (pode virar SPEC futura; aqui é só API + n8n).
- Email como canal (opcional/futuro).

## Conteúdo do digest

### Diário (`GET /resumo/diario`, opcional `?data=YYYY-MM-DD`, default hoje)
- **Vence hoje**: contas (`financeiro/vencimentos`) + lembretes + tarefas com prazo hoje.
- **Atrasados**: contas vencidas não pagas + tarefas/lembretes com prazo passado em aberto.
- **Agenda do dia**: compromissos de hoje (com horário), via `agenda` — expande recorrência (ADR-005).
- **VIPs aguardando**: recados de `ContatoVip` ainda não resolvidos/sem follow-up.
- **Próximos passos**: lista priorizada (atrasado > vence hoje > VIP aguardando).

### Semanal (`GET /resumo/semanal`, opcional `?inicio&?fim`, default últimos 7 dias)
- **KPIs da semana**: nº recados/tarefas criados, concluídos, % conclusão, contas pagas vs vencidas.
- **Curva diária** em sparkline (itens criados/concluídos por dia).
- **Comparativo vs semana anterior** (▲▼▬, com flag "baixo é bom" p/ atrasos/pendências).
- **Top compromissos/categorias** da semana.
- **Projeção/saúde**: backlog crescendo ou diminuindo; alerta se atrasados subirem.

## Critérios de aceite
- [ ] `GET /resumo/diario` e `GET /resumo/semanal` existem, **JWT ou `x-service-token`+`x-tenant-id`**, e **filtram por `tenantId`** (toda query passa por `requireTenantId()`).
- [ ] Resposta inclui `{ data: <estrutura>, texto: <string pronta p/ WhatsApp> }`.
- [ ] Texto diário `<2.000` chars; semanal `<4.000` chars (truncamento seguro com reticências, nunca corta no meio de uma linha).
- [ ] Dinheiro renderizado a partir de **inteiro de centavos** (reusa formatação existente do financeiro; nunca float).
- [ ] Datas/timezone corretas para `America/Sao_Paulo` (vencimento "hoje" respeita o fuso do tenant).
- [ ] Seções **vazias são omitidas** (sem VIP aguardando → seção não aparece; nunca inventa volume — igual restrição da skill original).
- [ ] Helpers `sparkline`, `setinha`, `fmtDuracao`/`fmtMoeda` isolados, testados unitariamente, `<` limite de LOC.
- [ ] Workflow n8n: Schedule diário (cron `45 7 * * 1-5`) + semanal (`0 17 * * 5`) → HTTP GET no endpoint (header auth `x-service-token` + `x-tenant-id`) → Evolution `sendText` no número do tenant. Idempotente (não duplica se rodar 2x).
- [ ] Sem `any` público; controller fino → service → repository; type-check + lint + boundaries limpos.

## Casos de borda
- Tenant sem nenhuma pendência → digest "tudo em dia" curto e positivo (não some o envio).
- Compromisso recorrente cai no dia → expandir ocorrência (ADR-005), não duplicar.
- Vencimento na virada de timezone (23h UTC vs horário local).
- Semana com 0 itens criados → comparativo mostra "—", não divide por zero.
- Número de WhatsApp do tenant ausente/ inválido → n8n loga e não quebra o schedule dos outros tenants.

## Requisitos técnicos
- Backend: novo `ResumoModule` (controller + service), **reusa** os services existentes (`FinanceiroService`, `TarefasService`, `LembretesService`, `AgendaService`, `RecadosService`) — sem reescrever lógica, agregação por leitura. Padrão igual ao `NinaModule` que já reusa services.
- Multi-tenant: `requireTenantId()` em toda leitura.
- n8n: nós novos precisam ter credencial **"Nina API service token"** selecionada na UI + **Publish** (limitação MCP conhecida — ver STATE).
- Número de destino do tenant: campo em `Tenant`/`Config` (se não existir, adicionar — decisão de schema mínima, talvez ADR).

## Riscos
- **Vazamento entre tenants**: digest de A indo pro número de B → mitigar com teste de isolamento cross-tenant no endpoint + n8n itera tenant a tenant com `x-tenant-id` correto.
- **Spam/horário**: enviar fora de hora ou repetido → idempotency + schedule fixo + opt-out por tenant (flag em Config).
- **Custo**: agregação pesada se muitos tenants → endpoints com queries indexadas por tenant; sem chamada de LLM no caminho do digest (é só leitura/format).
- LGPD: digest tem nome de cliente/recado → vai só pro privado do dono, nunca grupo (mesma boa-prática da skill original).

## Agentes necessários
Backend (build do ResumoModule + helpers) · n8n (workflow schedule) · Security e Standards (auditoria: isolamento de tenant, sem `any`, LOC).

## Harness necessário
Teste de isolamento cross-tenant no `/resumo/*` · teste de truncamento de texto (limite de chars) · teste unitário dos helpers (sparkline/setinha/fmt) · teste de timezone "vence hoje" · validação manual do envio n8n no WhatsApp.

## Premortem obrigatório: sim

## Decisões travadas (2026-06-19)
1. **Destino/opt-out**: campos novos em `Config` (por tenant) — `numeroDigest`, `digestDiarioAtivo`, `digestSemanalAtivo`. Migração mínima, sem ADR dedicado.
2. **Diário**: seg–sex, 7h45 (`45 7 * * 1-5`). Não envia fim de semana.
3. **Semanal**: sexta, 17h (`0 17 * * 5`).
