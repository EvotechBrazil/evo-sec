# SPEC-009 — Onda 1b: fechar os release-blockers (backup + resiliência n8n + webhook)

> Status: **EM IMPLEMENTAÇÃO** (Sprint 11) · Scrum master: Claude · 2026-06-24
> Fecha o restante dos release-blockers do `PREMORTEM-sistema-2026-06-24.md` (#1, #2, #3-n8n). A parte backend do #3 já saiu na SPEC-008.

## 1. Objetivo
- **#2 Backup/DR (ALTO):** Postgres de prod **sem backup** — perda total = pior cenário. Dar `pg_dump` diário + retenção + off-site + **restore testável**.
- **#3-n8n Resiliência (ALTO):** os `httpRequest` do n8n não têm timeout/retry/onError → falha externa = **silêncio** (já houve 6 erros/7 dias). Dar timeout + retry + ramo `onError` (fallback "tive um problema, pode repetir?") + Error Workflow.
- **#1 Webhook HMAC/segredo (CRÍTICO):** webhook público confia em `fromMe`/`remoteJid` do corpo → forjável. Validar segredo no 1º nó + path não-advinhável.

## 2. Escopo
- **#2 Backup** (`infra/backup/`): `backup.sh` (pg_dump → gzip → retenção → off-site S3/MinIO opcional), `restore.sh` (restaurar + validar), `README.md` (agendar no EasyPanel, RPO/RTO, **testar restore**). Código pronto; **o Tiago agenda** no EasyPanel (scheduled task) + roda 1 restore de teste.
- **#3-n8n** (workflow `Dqm3pJo2MNHcRZ1R`, draft via MCP, **publish do Tiago**): `options.timeout`≈15s + `retryOnFail`/`maxTries:2` nos `httpRequest`; ramo `onError: continueErrorOutput` no nó da Nina (LLM) → fallback Evolution sendText fixo; recomendar Error Workflow (dead-letter) na instância.
- **#1 Webhook** (coordenado): nó de validação de **segredo** (header `x-webhook-token` == `EVOLUTION_WEBHOOK_HMAC_SECRET`) no 1º passo do brain, rejeitando antes do filtro; **+ path não-advinhável** (renomear `/webhook/nina` → `/webhook/<token>`). **O Tiago** configura o Evolution p/ mandar o header/usar a URL nova. *(Fail-open enquanto o segredo não estiver setado, p/ não derrubar prod — flip p/ fail-closed após configurar.)*

## 3. Critérios de aceite
- [ ] `backup.sh`: pg_dump de `DATABASE_URL` → `.sql.gz` timestampado, retenção (`RETENTION_DAYS`), off-site opcional; falha ruidosa (`set -euo pipefail`). `restore.sh` documentado e testável.
- [ ] n8n: httpRequest com timeout+retry; ramo onError no LLM → mensagem de fallback (não silêncio); `validate_workflow` zero erros; **não publicado**.
- [ ] webhook: nó de validação de segredo (fail-open sem segredo) + plano de path não-advinhável; documentado o que o Tiago faz no Evolution.
- [ ] Nada quebra (isolamento/gatilho/pendingAction/ações intactos).

## 4. Harness
- Backup: `bash -n` (sintaxe) + dry-run lógico; doc de restore.
- n8n: `validate_workflow` + 2 auditores (não-regressão + segurança do webhook).
- Resultado em `.ai/HARNESS_RESULTS/SPRINT-11-spec-009-onda1b.md`.

## 5. Handoff (Tiago)
- **Backup:** volume **PERSISTENTE** + Scheduled Task diária rodando `backup.sh` (envs `DATABASE_URL`, `BACKUP_DIR`, off-site opcional `BACKUP_S3_URL`); **rodar 1 restore de teste** (`restore.sh` num banco de teste).
- **n8n resiliência (`Dqm3pJo2MNHcRZ1R`, 44 nós):** ⚠️ **Publicar o draft só ativa os timeouts** (corta o pendura de ~5min) — **NÃO resolve o silêncio** em falha externa. Pra fechar o #3, fazer na UI (o MCP não seta `retryOnFail`/`onError`):
  1. **Nina (OpenRouter)** → Settings: `Retry On Fail` ON · `Max Tries` 2 · `Wait` 1500ms · **On Error = "Continue (using error output)"**. Idem (só retry) em **Transcrever (OpenRouter)** e **Visao (Gemini)**.
  2. Criar nó **`Evolution sendText (fallback)`** (clonar URL/auth do `Evolution sendText`; credencial Evolution; body `number`=`{{ $('Monta Mensagens (memoria)').first().json.numero }}`, `text`="Tive um problema agora, pode repetir?"; timeout 15000).
  3. Ligar a **saída de ERRO da Nina** → o nó de fallback (não mexer na saída de sucesso → Interpreta Acao).
  4. **Settings → Error Workflow** da instância → workflow dead-letter (alerta).
  5. **Publish.**
- **Webhook #1 (CRÍTICO — a ORDEM importa, fail-open→fail-closed; inverter derruba o WhatsApp):** 1) adicionar nó de validação de segredo (fail-open enquanto sem segredo) + (opcional) renomear o path p/ não-advinhável; 2) setar `EVOLUTION_WEBHOOK_HMAC_SECRET` no n8n; 3) configurar o Evolution p/ mandar o header (ou usar a URL nova); 4) **validar** que as mensagens chegam; 5) só então **flip p/ fail-closed**.
- Riscos → `PREMORTEM-spec-009-onda1b.md`.
