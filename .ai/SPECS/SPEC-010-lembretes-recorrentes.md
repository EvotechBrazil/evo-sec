# SPEC-010 — Disparo de lembretes (incl. recorrentes)

> Status: **✅ backend pronto + auditado (SPRINT-13) · n8n criado (inativo `YTtIdxcNtgtENUgL`) · pendente publish + redeploy do Tiago** · 2026-06-25
> Fecha o achado **#6** do `PREMORTEM-sistema-2026-06-24.md` (ALTO): lembrete nunca dispara —
> nenhum job processa lembretes, `notificado` nunca é escrito, recorrência é no-op. Para uma
> secretária cuja promessa central é lembrar, é falha funcional silenciosa de alta probabilidade.

## 1. Objetivo
Fazer a Nina **disparar lembretes na hora** (incl. recorrentes que **re-disparam**), via WhatsApp,
respeitando **fuso** e **quiet hours** do tenant — espelhando o padrão dos alertas proativos
(SPEC-004) e digest (SPEC-002): **endpoint backend chamado por cron do n8n**.

Causa-raiz hoje: zero scheduler; o n8n só lê lembretes agregados no digest das 7h45 (1x/dia); nada
marca `notificado` nem avança a `dataHora`. Um "me lembra todo dia 8h" dispara no máximo 1x e depois
fica preso em PENDENTE/atrasado.

## 2. Decisões de design
- **Trigger:** cron do n8n (cada ~15 min) → `POST /resumo/lembretes` (tenant-scoped, service-token).
  Sem `@nestjs/schedule` (consistente com digest/alertas). **Cron frequente + checagem no backend
  (tz-aware) neutraliza o bug de fuso da instância n8n** (premortem #20): o backend decide "está na
  hora?" e "é quiet hours?" no fuso do tenant, então o horário do cron não importa, só a frequência.
- **POST (não GET):** o disparo **muta** (marca notificado / avança recorrência) → não é safe/idempotente
  como os GET de alertas.
- **Recorrência avança in-place** (o model não tem `recorrenciaPaiId`): após disparar, a MESMA linha
  tem `dataHora` avançada para a **próxima ocorrência futura** (passo único, não rajada de atrasados).
  - NENHUMA/CUSTOM → terminal: `status=NOTIFICADO`, `notificado=true` (dispara 1x e encerra).
  - DIARIO/SEMANAL/MENSAL/ANUAL → `dataHora` = próxima ocorrência > agora; `status` segue `PENDENTE`.
- **Quiet hours:** se agora ∈ `[quietHoursInicio, quietHoursFim)` (fuso do tenant, com wrap à
  meia-noite) → **suprime e NÃO muta** (o lembrete continua pendente e dispara após o silêncio).
- **Opt-out:** Config `lembretes_ativo` (ausente = ativo), via `flagAtiva`.
- **Entrega at-most-once (v1):** marca/avança **antes** de devolver o texto (mutação atômica em
  transação). Se o envio do n8n falhar, o lembrete fica marcado (mitigado pelo onError/fallback do
  n8n). Confirmação em 2 fases fica como incremento futuro (premortem #9/#17).
- **Mono-tenant:** 1 POST por tenant (x-tenant-id), como digest/alertas. Iteração multi-tenant = Onda 3.

## 3. Escopo (arquivos)
**Backend (`backend/src`):**
- `common/datas/recorrencia.util.ts` (novo) — `proximaOcorrencia(base, recorrencia, apos): Date | null`
  (passo DIARIO/SEMANAL/MENSAL/ANUAL até `> apos`; `null` p/ NENHUMA/CUSTOM; cap de iterações).
- `common/datas/quiet-hours.util.ts` (novo) — `dentroQuietHours(now, tz, inicio?, fim?): boolean`
  (HH:MM no fuso do tenant via `Intl`; trata janela que cruza a meia-noite; `false` se inícios/fim ausentes).
- `modules/lembretes/lembretes.service.ts` — novo `dispararPendentes(now: Date): Promise<Lembrete[]>`:
  acha `dataHora <= now` + `status=PENDENTE`; p/ cada um marca/avança (em transação); devolve os que
  dispararam. Reusa repo (tenant-scoped).
- `modules/lembretes/lembretes.repository.ts` — método de disparo em **transação** (`$transaction`)
  marcando terminais e avançando recorrentes de uma vez (tenant-scoped, idempotente por status).
- `modules/resumo/alertas/alertas-lembretes.service.ts` (novo) — `AlertaLembretesService.gerar(dataIso?)`:
  `flagAtiva('lembretes_ativo')` → `tenantInfo()` (tz, numero, quiet hours) → checa quiet → chama
  `LembretesService.dispararPendentes` → monta envelope + `texto` (≤2000, tz-aware, `fmtHora`).
- `modules/resumo/alertas/alertas.controller.ts` — `@Post('lembretes')` → `dispararLembretes(@Query('data') data?)`.
- `modules/resumo/resumo.repository.ts` — `tenantInfo()` passa a retornar `quietHoursInicio/Fim` (aditivo).
- `modules/resumo/resumo.module.ts` — registra `AlertaLembretesService`.

**Testes:**
- `recorrencia.util.spec.ts`, `quiet-hours.util.spec.ts`, `alertas-lembretes.service.spec.ts`,
  e disparo em `lembretes.service.spec.ts` (tenant-scoped + mutação).

**n8n (workflow novo via MCP, publish do Tiago):**
- `Nina — Lembretes`: Schedule (cada 15 min) → HTTP `POST /resumo/lembretes` (httpHeaderAuth
  service-token + `x-tenant-id`) → IF (`ativo && temLembrete && numero`, `loose`) → Evolution sendText.
- Doc `n8n/workflows/nina-lembretes.md`.

## 4. Envelope (resposta do endpoint)
```ts
interface AlertaLembretes {
  ativo: boolean;              // flagAtiva('lembretes_ativo')
  numero: string | null;      // tenant.whatsappNumber
  temLembrete: boolean;       // disparou algo agora (e não quiet/opt-out)
  dia: string;                // "DD/MM" no fuso do tenant
  quiet: boolean;             // suprimido por quiet hours?
  lembretes: { titulo: string; hora: string; recorrencia: string }[];
  texto: string;              // pronto p/ WhatsApp (≤2000)
}
```

## 5. Critérios de aceite (verificáveis)
- [ ] `POST /resumo/lembretes` tenant-scoped; envelope acima.
- [ ] PENDENTE não-recorrente `dataHora<=now` → entra no `texto`; vira `NOTIFICADO`+`notificado=true`.
- [ ] Lembrete futuro (`dataHora>now`) → **não** dispara, inalterado.
- [ ] Recorrente DIARIO `dataHora<=now` → dispara 1x; `dataHora` avança p/ próximo dia **futuro**; `status=PENDENTE`.
- [ ] Recorrente atrasado (venceu há 3 dias) → dispara **1x** e avança p/ a próxima ocorrência **futura** (sem rajada).
- [ ] `lembretes_ativo=false` → `ativo:false`, **nada mutado**.
- [ ] Quiet hours (agora ∈ janela, com wrap meia-noite, fuso do tenant) → `quiet:true`, `temLembrete:false`, **nada mutado**.
- [ ] `dia`/`hora` e quiet hours computados no **fuso do tenant**.
- [ ] Isolamento de tenant (repo filtra `tenantId`; teste com `runWithTenant`).
- [ ] `texto` truncado ≤2000.
- [ ] `tsc` + lint verdes; testes novos passando.

## 6. Harness
- Unit: `recorrencia.util` (cada cadência + atrasado→futuro + NENHUMA→null + borda de mês),
  `quiet-hours.util` (dentro/fora + wrap meia-noite + sem config), `alertas-lembretes.service`
  (opt-out, quiet, dispara/marca, futuro intacto, truncamento, tz), `lembretes.service.disparar`
  (mutação + tenant guard).
- `validate_workflow` no n8n + 2 auditores (não-regressão/tenant + QA dos critérios).
- Resultado em `.ai/HARNESS_RESULTS/SPRINT-13-spec-010-lembretes.md`.

## 7. Handoff (Tiago)
- **Publicar** o workflow `Nina — Lembretes` (cron 15 min) + apontar credenciais (service-token + Evolution).
- **Redeploy da API** (endpoint `/resumo/lembretes` novo).
- (Opcional) Setar `quietHoursInicio/Fim` no Tenant (ex.: 22:00 / 07:00) p/ não acordar de madrugada.

## 8. Fora de escopo (registrado)
- Confirmação de envio em 2 fases (at-least-once) — premortem #9/#17.
- Iteração multi-tenant nos crons — premortem #5 (Onda 3).
- DST: `proximaOcorrencia` usa passo de calendário; BR sem DST hoje (premortem #25, deixado com teste-guarda).
