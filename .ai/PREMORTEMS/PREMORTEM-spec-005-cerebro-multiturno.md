# PREMORTEM — SPEC-005 (Cérebro multi-turno + classificação)

> Mudança num workflow de **produção** (43 nós, cérebro do WhatsApp). Risco principal: regressão. Mitigação geral: editar **draft** via MCP (não publica), 2 auditores + republish manual do Tiago = nada vai ao ar sem revisão.

| # | Risco | P×I | Mitigação |
|---|---|---|---|
| 1 | **Quebrar o fluxo de produção** (isolamento, pendingAction, ações) ao mexer nos code nodes | **20** | Editar só o necessário; preservar a lógica de `sessaoAtivaAte`/`pendingAction`; `validate_workflow` zero erros; 2 auditores conferem não-regressão; **publish só pelo Tiago** após teste. |
| 2 | **Vazamento de contexto entre números/tenants** (histórico de um cai noutro) | **20** | Buffer keyed por `numero`; só self-chat alimenta; expira com a sessão; auditor confere o keying. |
| 3 | **Prompt regressão** — mudar `criar_conta` quebra outras classificações (movimentação/baixa) | 12 | Mudança cirúrgica só na definição de `criar_conta` + regra-chave; manter exemplos das outras ações; teste das frases-tipo. |
| 4 | **staticData cresce sem limite** (memória/uso) | 9 | Ring buffer cap ~8 por número; poda no append; expira com a sessão. |
| 5 | **Histórico estoura tokens / custo** | 9 | Cap ~8 trocas curtas; `max_tokens` controlado; histórico só de texto. |
| 6 | **staticData não-durável** (perde no restart/reimport do n8n) | 6 | Aceitável p/ janela de 30 min (perda = Nina esquece 1x após deploy). Durável = backend Contexto (incremento futuro, fora de escopo). |
| 7 | **Concorrência** (2 msgs simultâneas) corrompe o buffer | 4 | Uso single-user sequencial; risco baixo; append idempotente por turno. |

## Gate de saída
`validate_workflow` zero erros · 2 auditores aprovam (não-regressão + classificação) · execução simulada multi-turno OK · doc + STATE atualizados · **Tiago republica e testa no WhatsApp**.
