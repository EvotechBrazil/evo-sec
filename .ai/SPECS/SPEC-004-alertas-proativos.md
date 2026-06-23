# SPEC-004 — Alertas proativos da Nina (vencimentos · aporte/meta · follow-up "aguardando")

> Status: **EM IMPLEMENTAÇÃO** (Sprint 6) · Autor: Claude (scrum master) · 2026-06-23
> Depende de: SPEC-002 (digest/ResumoModule, padrão de texto pronto p/ WhatsApp) · ADR-007 (modelagem financeira)

## 1. Objetivo
Tornar a Nina **proativa**: hoje ela só responde quando provocada (reativa). Faltam os CRONs que o MASTERPLAN previu ("Verificação contínua · Vencimentos · Lembrete/alerta de aporte"). Esta SPEC entrega **3 alertas agendados** que a Nina dispara sozinha no WhatsApp:

1. **Vencimentos** — contas a pagar/receber **atrasadas**, que **vencem hoje** ou nos **próximos dias**.
2. **Aporte / meta atrasada** — lembrete de aporte e aviso de metas **atrás do ritmo** (coach educativo).
3. **Follow-up "aguardando"** — cobrar tarefas `tipo=AGUARDANDO` cuja `dataCobranca` chegou ("verificação contínua" do GTD).

## 2. Decisão de arquitetura (por quê assim)
- **Onde:** os 3 alertas vivem no **`ResumoModule`** (a casa dos read-models proativos do digest — SPEC-002), cada um como vertical slice própria em `src/modules/resumo/alertas/` (`alertas-<x>.service.ts` + `.spec.ts`), um único `AlertasController` (`@Controller('resumo')`, rotas `/resumo/vencimentos|aportes|follow-ups`). Mantém a config do n8n **idêntica ao digest** (mesma base, mesma auth, mesmo padrão de envelope).
- **Reuso, não reescrita** (regra DEV OS): cada serviço reusa o domain service existente — `FinanceiroService.vencimentos()`, `FinancasService.evolucao()` (já traz `atrasada`+`progressoPct`+`disclaimer`), `TarefasService.list(AGUARDANDO)` — mais `ResumoRepository.tenantInfo()`/`flagAtiva()` (tenant + opt-out) e os helpers puros de `format.util` (`fmtMoeda`, `truncar`, `fmtData`, `limitesDoDia`, tz-aware).
- **CRON sem LLM:** alerta é leitura + template (SQL+texto), zero token — princípio §5 do MASTERPLAN.
- **`temAlerta` (novo):** diferente do digest (que sai todo dia), alerta é **ruído se vazio**. Cada envelope expõe `temAlerta`; o n8n só envia quando `ativo && numero && temAlerta`. Sem "nada a cobrar hoje" no WhatsApp.

## 3. Contrato — envelope comum
Todo endpoint é tenant-scoped (JWT **ou** `x-service-token`+`x-tenant-id`) e devolve (envelopado pelo `ResponseInterceptor` em `{ data: ... }`):

```ts
{
  ativo: boolean;        // opt-out via Config (ausente = ativo; "false" = inativo)
  numero: string | null; // Tenant.whatsappNumber (destino)
  temAlerta: boolean;    // há algo a notificar AGORA (gate do n8n)
  dia: string;           // "24/06" no tz do tenant
  resumo: { ...contagens/totais em centavos... };
  texto: string;         // pronto p/ WhatsApp, <= 2.000 chars (truncado por linha)
}
```

### 3.1 Vencimentos — `GET /resumo/vencimentos`
- Fonte: `FinanceiroService.vencimentos(dias=7)` → contas `status IN (PENDENTE, ATRASADO)` e `vencimento <= hoje+7`.
- Categoriza **on-read** pela janela do dia (`limitesDoDia`, tz do tenant): **atrasada** (`vencimento < início de hoje`), **vence hoje** (`início ≤ vencimento < fim`), **próximos** (`≥ fim`, até +7d). Separa `A_PAGAR` (você paga) de `A_RECEBER` (você recebe) no texto.
- `temAlerta = atrasadas + venceHoje > 0` (os "próximos" são heads-up: aparecem no texto quando já há alerta, mas não disparam sozinhos — evita alerta diário só por ter conta futura).
- Opt-out: Config `alerta_vencimentos_ativo`.
- Cadência n8n sugerida: **diário 8h** (`0 8 * * *` — contas vencem fim de semana também).

### 3.2 Aporte / meta atrasada — `GET /resumo/aportes`
- Fonte: `FinancasService.evolucao()` → metas com `atrasada` (progresso < esperado-5pp), `progressoPct`, `aporteMensalSugeridoCent`, `status`, e o `disclaimer` educativo.
- Sinaliza: metas **atrasadas** + **aporte sugerido** (usa `aporteMensalSugeridoCent`; se ausente e houver `prazo`, calcula `(alvo-atual)/mesesRestantes`). Só metas `status=ATIVA` e `progressoPct < 100`.
- `temAlerta = metasAtrasadas > 0 || aportesSugeridos > 0`.
- **Guardrail (inviolável):** o `texto` **sempre** inclui o `disclaimer` (coach educativo, não recomendação regulada). Nunca usa imperativo de "invista X" — linguagem sugestiva.
- Opt-out: Config `alerta_aportes_ativo`.
- Cadência n8n sugerida: **semanal segunda 9h** (`0 9 * * 1`).

### 3.3 Follow-up "aguardando" — `GET /resumo/follow-ups`
- Fonte: `TarefasService.list(TarefaTipo.AGUARDANDO)` → filtra `status=PENDENTE` e `dataCobranca <= fim de hoje` (tz do tenant).
- `texto` lista cada item: título — de quem (`aguardandoDe`) — desde quando. Ordena por `dataCobranca` asc (mais antigo primeiro).
- `temAlerta = aCobrar > 0`.
- Opt-out: Config `alerta_aguardando_ativo`.
- Cadência n8n sugerida: **dias úteis 8h30** (`30 8 * * 1-5`).

## 4. Critérios de aceite (verificáveis)
- [ ] `GET /resumo/vencimentos`, `/resumo/aportes`, `/resumo/follow-ups` existem, **JWT ou `x-service-token`+`x-tenant-id`**, e **toda query filtra `tenantId`** (via `requireTenantId()`).
- [ ] Cada resposta segue o envelope §3 com `ativo`, `numero`, `temAlerta`, `dia`, `resumo`, `texto`.
- [ ] `texto` <= **2.000 chars** (truncamento por linha inteira via `truncar`).
- [ ] Dinheiro renderizado de **inteiro de centavos** (`fmtMoeda`), **nunca float**.
- [ ] Datas/janelas corretas para `America/Sao_Paulo` (atrasado vs hoje vs próximos respeitam a borda do dia no tz do tenant).
- [ ] **Opt-out**: Config `*_ativo="false"` → `ativo:false`; ausente → `ativo:true`.
- [ ] **`temAlerta=false` quando não há nada** a notificar (lista vazia → n8n não envia).
- [ ] **Aportes inclui o `disclaimer`** educativo no `texto` (guardrail do coach).
- [ ] Sem `any` público; arquivos < 500 LOC; helpers reusados (sem duplicar `format.util`).
- [ ] `tsc --noEmit` verde; `yarn test` verde (back).

## 5. Harness (provas)
- **Unit por serviço** (espelha `resumo.service.spec.ts`, builder + mocks): (a) categorização correta (atrasada/hoje/próximos; meta atrasada; aguardando vencido); (b) opt-out (`flagAtiva=false` → `ativo:false`); (c) `temAlerta` falso quando vazio; (d) moeda em centavos; (e) tz-aware (borda do dia); (f) aportes contém disclaimer.
- **Guarda de tenant**: reusa o padrão de `resumo.repository.spec.ts` (sem contexto → lança; com contexto → propaga `tenantId`). Como os serviços reusam `ResumoRepository` (já coberto), os specs focam na lógica de cada alerta.
- **E2E local** (opcional, se Postgres `evosec-pg` no ar): login → criar conta atrasada/meta atrasada/tarefa aguardando vencida → GET dos 3 → `temAlerta:true` e texto correto; opt-out → `ativo:false`.
- Resultado em `.ai/HARNESS_RESULTS/SPRINT-6-spec-004-alertas-proativos.md`.

## 6. n8n (Sprint 2) — 3 workflows Schedule
Padrão idêntico ao digest (`nina-digest.md`): **Schedule** (cron §3) → **HTTP GET** `/resumo/<x>` (httpHeaderAuth "Nina API service token" + `x-tenant-id` literal) → **IF** (`{{$json.data.ativo}}` true **&&** `{{$json.data.temAlerta}}` true **&&** `{{$json.data.numero}}` notEmpty; `typeValidation: loose` + `looseTypeValidation` — gotcha conhecido) → **Evolution sendText** (`number`=`data.numero`, `text`=`data.texto`).
- Construído via MCP do n8n; **publish é manual do Tiago** (classificador bloqueia publish via MCP). Credencial selecionada na UI quando preciso.
- Doc: `n8n/workflows/nina-alertas.md`.

## 7. Fora de escopo (incrementos futuros)
- Materializar `ContaStatus.ATRASADO` no banco (hoje calculado on-read — suficiente).
- Quiet hours por tenant nos alertas (respeitar `Tenant.quietHours*`).
- Botões de ação no WhatsApp (ex.: "marcar pago") a partir do alerta.
- Tela no app listando o que será alertado / toggles de opt-out.
