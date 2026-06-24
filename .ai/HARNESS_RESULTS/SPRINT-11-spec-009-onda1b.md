# HARNESS — SPRINT 11 / SPEC-009 (Onda 1b)

> 2026-06-24 · Scrum master: Claude · Branch `feat/spec-009-onda1b-backup-resiliencia`

## Escopo entregue
- **#2 Backup (código pronto):** `infra/backup/` — `backup.sh` (pg_dump → gzip → arquivo timestampado, sanidade, retenção, off-site S3/MinIO **tolerante a falha**), `restore.sh` (sobrescreve com aviso + `ON_ERROR_STOP` + guarda de alvo), `README.md` (agendar no EasyPanel, volume persistente, **testar restore**, RPO/RTO).
- **#3-n8n resiliência (draft via MCP):** `options.timeout=15000` nos **23/23** `httpRequest` do brain (`Dqm3pJo2MNHcRZ1R`) — drift-zero (44 nós, conexões idênticas), **NÃO publicado**. ⚠️ **MCP não seta `retryOnFail`/`onError`** → retry + onError + nó de fallback são passos de **UI do Tiago** (documentados na SPEC §5).
- **#1 webhook (plano):** fail-open→fail-closed documentado (validação de segredo + path não-advinhável; ordem importa pra não derrubar o WhatsApp).

## Provas
- **`bash -n`** ok (backup.sh + restore.sh). **`validate_workflow`** do brain (draft) = `valid:true`. `versionId != activeVersionId` (prod intacta).
- **Auditoria (2 agentes):**
  - **Backup (segurança de dados):** APROVADO COM RESSALVAS → **corrigido:** off-site não é mais "obrigatório acidental" (falha do `aws s3 cp` não derruba o backup local); guarda no restore (avisa se o alvo veio do env = pode ser prod). Retenção confirmada escopada (`-maxdepth 1` + padrão `nina-*.sql.gz`, não apaga o recém-criado).
  - **n8n + handoff:** APROVADO (0 bloqueador) → 23/23 timeout, drift-zero, não publicado, **sem nó de fallback dangling**; `parameters.retryOnFail:false` residual é **inerte** (n8n lê na raiz). **Corrigido [MAIOR]:** o caveat honesto ("publicar o draft só ativa timeout, NÃO resolve o silêncio") + os passos de UI agora estão na SPEC §5; contagem alinhada (44 nós).

## Pendente (handoff Tiago — SPEC-009 §5)
1. **Backup:** volume persistente + Scheduled Task diária + **rodar 1 restore de teste**.
2. **n8n:** passos de UI (retry/onError/fallback na Nina + Error Workflow) + **publish** — sem isso, timeout sozinho ainda devolve silêncio.
3. **Webhook #1 (crítico):** nó fail-open → setar segredo → Evolution manda header → validar → flip fail-closed.

## Restante do premortem
Ondas 2–3 (`PREMORTEM-sistema-2026-06-24.md`): #6 lembrete recorrente, #8 tz financeiro, #9 idempotência, #14 observabilidade, #4/#5/#11 RLS + multi-tenant.
