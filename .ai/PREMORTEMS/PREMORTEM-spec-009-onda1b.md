# PREMORTEM — SPEC-009 (Onda 1b)

| # | Risco | P×I | Mitigação |
|---|---|---|---|
| 1 | **Backup gravado em volume efêmero** → some no restart (falso senso de segurança) | **16** | README exige `BACKUP_DIR` em volume PERSISTENTE + off-site `BACKUP_S3_URL`. |
| 2 | **Restore nunca testado** → na hora H não funciona | **15** | `restore.sh` + seção "TESTAR o restore" obrigatória; handoff pede 1 teste real. |
| 3 | **Webhook flip p/ fail-closed sem Evolution configurado** → derruba o WhatsApp inteiro | **16** | Nó valida **fail-open** enquanto o segredo não estiver setado; só vira fail-closed após o Tiago configurar o Evolution + validar. |
| 4 | **onError no brain quebra o fluxo feliz** (43 nós de produção) | **12** | Mudança mínima: `timeout`/`retryOnFail` (config, baixo risco) + 1 ramo onError no nó LLM → fallback sendText; `validate_workflow`; 2 auditores; **publish do Tiago**. |
| 5 | **Retry duplica ação de escrita** (POST não-idempotente) | 10 | `retryOnFail` só nos nós idempotentes (LLM/leitura); nos POST de escrita, preferir onError a retry (ou idempotency — premortem #9, Onda 2). |
| 6 | **`pg_dump`/`psql` ausentes na imagem** | 6 | README exige imagem com `postgresql-client`. |
| 7 | **Backup pesa/concorre com a carga** | 4 | Diário 3h (baixo tráfego); gzip; retenção. |

## Gate de saída
`bash -n` ok nos scripts · `validate_workflow` n8n zero erros (draft) · 2 auditores aprovam · STATE atualizado · handoff claro (Tiago: agendar backup + testar restore + publicar n8n + configurar Evolution).
