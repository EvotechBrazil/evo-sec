# SPRINT-13 — SPEC-010: disparo de lembretes (incl. recorrentes)

> Fecha o achado **#6** do `PREMORTEM-sistema-2026-06-24.md` (ALTO): lembrete nunca re-disparava.

## Escopo entregue
- **Endpoint** `POST /api/v1/resumo/lembretes` (tenant-scoped) — acha vencidos, devolve texto p/
  WhatsApp, **muta** (marca não-recorrentes `NOTIFICADO`; avança recorrentes in-place). Envelope
  `{ativo,numero,temLembrete,dia,quiet,lembretes,texto}`.
- **Utils** `recorrencia.util` (`proximaOcorrencia` — avança até > apos, atrasado sem rajada,
  NENHUMA/CUSTOM→null) e `quiet-hours.util` (`dentroQuietHours` tz-aware, wrap meia-noite).
- **LembretesService.dispararPendentes** + `LembretesRepository.findDue`/`aplicarDisparo`
  (mutação atômica em `$transaction`, tenant-scoped).
- **AlertaLembretesService** (opt-out `lembretes_ativo`, quiet hours, formatação) + rota no
  `AlertasController` + `ResumoRepository.tenantInfo` estendido (quiet hours).
- **n8n** workflow `YTtIdxcNtgtENUgL` (`Nina — Lembretes`, 4 nós, **inativo**) — cron 15 min →
  POST → IF `loose` → Evolution. Doc `n8n/workflows/nina-lembretes.md`.

## Harness
- ✅ `yarn build` (nest/tsc): **verde**.
- ✅ `yarn test`: **119 testes** (suíte 118 verde nos 2 auditores + caso CUSTOM adicionado depois;
  file verde 5/5). 26 testes são da SPEC-010 (recorrencia, quiet-hours, disparo service+repo, alerta).
- ✅ `validate_workflow` (n8n): `valid`, 4 nós.
- ⚠️ `yarn lint`: **não executável** — `eslint` não instalado (sem dep nem config no repo). Gap
  **pré-existente** (o script é fantasma), não introduzido aqui; `tsc` cobre tipos. Quick-win futuro.

## Auditores (2, papéis separados — DEV OS)
- **Segurança/tenant + não-regressão:** **APROVADO COM RESSALVAS**. Tenant-scope na camada 1 em
  todas as queries novas (incl. transação); `tenantInfo` aditivo não regride alertas/digest;
  quiet/opt-out fazem early-return antes de mutar.
- **QA dos critérios:** **APROVADO COM RESSALVAS**. 10/11 critérios ATENDE; o 11º (lint) PARCIAL só
  pelo eslint ausente. **Contrato n8n íntegro:** `ResponseInterceptor` global envelopa em `{data}` →
  o IF (`data.ativo/temLembrete/numero`) e o sendText (`data.numero/texto`) batem.

## Ressalvas registradas (nenhuma bloqueante)
- **A6 (médio, fora de escopo declarado):** **at-most-once** — muta ANTES do envio; se o `sendText`
  do n8n falhar, o lembrete fica marcado e não chega. Mitigado pelo onError/fallback do n8n.
  2-fases (at-least-once) = premortem #9/#17, incremento futuro. **Risco operacional nº1 — monitorar.**
- **MENSAL borda de mês:** overflow nativo do JS (31/01→03/03); documentado/aceito na v1.
- **`?data=` muta contra meio-dia-UTC** — só p/ teste/trigger manual; produção (cron) usa hora real.

## Handoff (Tiago) — a feature só liga aqui
1. Credenciais no workflow (`Disparar Lembretes`→service token; `Enviar`→Evolution) + **publicar**.
2. **Redeploy da API** (endpoint novo; sem deploy = 404).
3. (Opcional) `quietHoursInicio/Fim` no Tenant. Opt-out: Config `lembretes_ativo=false`.
- Sem migração (colunas quiet hours já existiam desde `20260616232626_init`).
