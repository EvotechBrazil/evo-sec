# Nina — Lembretes (SPEC-010, disparo de lembretes recorrentes)

> Fecha o achado **#6** do premortem do sistema: lembrete nunca re-disparava. Agora um cron do
> n8n bate o backend a cada 15 min; o **backend** decide "está na hora?" e "é quiet hours?" no
> **fuso do tenant**, dispara, e marca/avança a recorrência. Cron frequente + decisão no backend
> neutraliza o bug de fuso da instância n8n (premortem #20).

## Workflow `YTtIdxcNtgtENUgL` ("Nina — Lembretes", 4 nós) — criado via MCP, **inativo**
```
Gatilho Lembretes (15 min)  →  Disparar Lembretes  →  Ativo, com lembrete e numero?  →(true)  Enviar no WhatsApp
   (scheduleTrigger 1.3)        (HTTP POST)              (IF loose)                              (Evolution sendText)
```
- **Gatilho:** `scheduleTrigger` cron `0 */15 * * * *` (a cada 15 min).
- **Disparar Lembretes:** `POST https://nina-api.rte6ms.easypanel.host/api/v1/resumo/lembretes`
  com `httpHeaderAuth` (service token) + header `x-tenant-id: 00000000-…-0001`. **Muta** (marca
  notificado / avança recorrência) — por isso POST.
- **IF** (`typeValidation: loose` + `looseTypeValidation: true`): `data.ativo` true **&&**
  `data.temLembrete` true **&&** `data.numero` notEmpty. ⚠️ O MCP normaliza IF p/ `strict` e quebra
  boolean `is true` → mantido `loose` (mesma pegadinha do digest/alertas).
- **Enviar no WhatsApp:** `POST .../message/sendText/nina`, `number={{ $json.data.numero }}`,
  `text={{ $json.data.texto }}`.

## Handoff (Tiago) — a feature só liga aqui
1. **Apontar credenciais** (MCP não anexa `httpHeaderAuth`): `Disparar Lembretes` → **Nina API
   service token**; `Enviar no WhatsApp` → **Evolution**.
2. **Publicar/ativar** o workflow.
3. **Redeploy da API** (endpoint `POST /resumo/lembretes` é novo — sem deploy dá 404).
4. (Opcional) Setar `quietHoursInicio`/`quietHoursFim` no Tenant (ex.: `22:00`/`07:00`) p/ não
   disparar de madrugada. Opt-out total: Config `lembretes_ativo=false`.

## Como validar (E2E)
- Criar um lembrete vencido pela Nina/app (`dataHora` no passado, `recorrencia` NENHUMA) →
  no próximo tick (≤15 min) chega no WhatsApp e o lembrete vira `NOTIFICADO`.
- Criar um `DIARIO` com `dataHora` de poucos minutos atrás → dispara 1x e a `dataHora` avança p/ o
  dia seguinte (não re-dispara no mesmo ciclo).
- Execução manual do workflow (n8n) serve p/ testar sem esperar o cron.

## Referências
- SPEC: `.ai/SPECS/SPEC-010-lembretes-recorrentes.md` · Harness: `.ai/HARNESS_RESULTS/SPRINT-13-spec-010-lembretes.md`
- Endpoint: `POST /api/v1/resumo/lembretes` (envelope `{ativo,numero,temLembrete,dia,quiet,lembretes,texto}`).
