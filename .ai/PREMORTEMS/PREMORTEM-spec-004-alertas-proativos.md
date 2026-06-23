# PREMORTEM — SPEC-004 (Alertas proativos)

> "Imagine que deu errado." Riscos com P×I (1–25) e mitigação. Classe P1 (multi-tenant, WhatsApp ao cliente).

| # | Risco (o que daria errado) | P×I | Mitigação (nesta SPEC) |
|---|---|---|---|
| 1 | **Spam/ruído**: alerta dispara todo dia mesmo sem nada a avisar | **16** | Campo `temAlerta`; n8n só envia se `ativo && numero && temAlerta`. Vazio → silêncio. Critério de aceite + teste. |
| 2 | **Vazamento entre tenants** (alerta de um tenant cai no número de outro) | **20** | Toda leitura via `requireTenantId()`; `numero` vem do `Tenant.whatsappNumber` do **mesmo** contexto; reusa `ResumoRepository` já coberto por teste de isolamento. |
| 3 | **Erro de fuso** (conta "vence hoje" classificada como atrasada na virada do dia, ou alerta às 21h de ontem) | **15** | `limitesDoDia(now, tz)` (tz do tenant, já testado no digest); testes de borda do dia; cron em horário comercial. |
| 4 | **Conselho de aporte visto como recomendação regulada** | **16** | `disclaimer` educativo **sempre** no texto (critério de aceite + teste); reusa `FinancasService.evolucao()` que já carrega o disclaimer; linguagem sugestiva, nunca imperativa. |
| 5 | **Dinheiro errado** (float/centavos) no valor de conta/aporte | **12** | `fmtMoeda(centavos)` (inteiro→R$), valores sempre em `*Centavos`; teste de moeda. |
| 6 | **Opt-out ignorado** (cliente desligou e continua recebendo) | **12** | `flagAtiva('alerta_*_ativo')` (ausente=ativo, "false"=inativo) no envelope; n8n respeita `ativo`; teste de opt-out. |
| 7 | **Texto estoura limite do WhatsApp** (muitos itens) | 9 | `truncar(texto, 2000)` por linha inteira; critério de aceite. |
| 8 | **Cron dispara 2× / fora de ordem** (duplica mensagem) | 8 | Endpoint é **leitura idempotente** (sem efeito colateral); reenvio = mesmo texto, sem corromper dado. |
| 9 | **Agentes paralelos colidem** (mesmo arquivo) | 9 | Cada agente só edita seu `alertas-<x>.service.ts` + `.spec.ts`; controller/módulo/scaffold são do scrum master (zero overlap). |
| 10 | **n8n quebra com IF `strict`** (boolean `is true` falha) — gotcha SPEC-002 | 10 | `typeValidation: loose` + `looseTypeValidation:true` nos IFs (documentado); publish manual do Tiago confere. |

## Gate de saída (antes de "pronto")
- Sprint 1 (backend): `tsc --noEmit` verde · `yarn test` verde · 2 auditores (segurança/tenant + harness/QA) aprovam · STATE atualizado.
- Sprint 2 (n8n): 3 workflows criados via MCP · 2 auditores (config/cron/auth + de-branding/guardrail) aprovam · doc `nina-alertas.md` · **publish pelo Tiago** + validação E2E em prod pós-deploy.
