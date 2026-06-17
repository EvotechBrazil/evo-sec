# PREMORTEM — evo-sec (Nina) — Produção   (momento: pré-deploy · 2026-06-17)

## Narrativa do fracasso
"Subimos a Nina. Nas primeiras 24h: a chave do OpenRouter não tinha crédito e toda mensagem falhou silenciosamente; o webhook do Evolution apontava para o n8n errado e a Nina não respondia; o número do gatilho no `Tenant` estava sem o DDI e o filtro derrubava tudo; e como a RLS de banco não estava forçada, um segundo tenant de teste enxergou dados do Rodrigo."

## Riscos pré-deploy (P × I) e mitigação

| # | Risco | P | I | Score | Mitigação / GO-gate |
|---|---|---|---|---|---|
| 1 | Credenciais ausentes/sem crédito (OpenRouter/Evolution) | 4 | 5 | **20** | Checklist de env + smoke test real de 1 mensagem antes de liberar |
| 2 | Webhook Evolution mal configurado | 3 | 5 | 15 | Validar `MESSAGES_UPSERT` → n8n; teste self-chat com código |
| 3 | Número/gatilho do tenant errado | 3 | 5 | 15 | Conferir `Tenant.whatsappNumber` (com DDI 55) e `gatilhoCodigoHash` |
| 4 | RLS de banco não forçada (multi-tenant futuro) | 3 | 5 | 15 | ADR-006: ativar role não-owner antes de abrir 2º tenant |
| 5 | Custo de token dispara | 3 | 4 | 12 | Tetos por tarefa (`Modelo`), `usos-llm` + alerta de orçamento |
| 6 | Falha silenciosa sem alerta | 3 | 4 | 12 | Logs + alerta ativo; dead-letter no n8n |
| 7 | Migração sem rollback | 2 | 4 | 8 | Backup do Postgres testado antes do deploy |

## Checklist GO/NO-GO (pré-deploy)
- [ ] `.env` completo (DATABASE_URL, JWT, ENCRYPTION_KEY 32, SERVICE_TOKEN, OPENROUTER_API_KEY, EVOLUTION_*)
- [ ] OpenRouter com crédito; modelos da tabela `Modelo` válidos
- [ ] Webhook Evolution → n8n testado (self-chat + código aciona; terceiro é ignorado)
- [ ] `Tenant` do Rodrigo: número com DDI 55 + código do gatilho corretos
- [ ] Backup do banco testado; rollback de migração documentado
- [ ] Harness verde; monitoramento/alerta ativos
- [ ] RLS: decidir camada 2 (ADR-006) antes de habilitar 2º tenant

**GO / NO-GO:** _____ (preencher na sessão de pré-deploy)
