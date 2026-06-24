# PREMORTEM — SPEC-007 (Data/timezone do orb)

| # | Risco | P×I | Mitigação |
|---|---|---|---|
| 1 | **`ancorarDataBR` quebra datas válidas** (ex. compromisso com hora real vira meia-noite) | **12** | Se a string já tem offset (`±HH:MM`), **mantém intacta**; só ancora `date-only` e `Z`/UTC-midnight (que são "dias"). Testes cobrindo datetime real. |
| 2 | **"Perguntar em vez de chutar" vira chato** (pergunta demais) | 8 | Só pergunta quando o dado é **essencial e ausente** (vencimento de conta, início de agenda, dataHora de lembrete). Tarefa/recado/movimentação não exigem data. |
| 3 | **Quebrar o WhatsApp** (que já funciona) | 10 | O fix é só no backend (`nina.service`/`openrouter.adapter` do app); o cérebro do WhatsApp é o workflow n8n, **separado** — não tocado. |
| 4 | **Premissa UTC-3 fixa errada** (se o Brasil voltar com horário de verão) | 4 | Brasil sem DST desde 2019; `agoraSaoPaulo` deriva o wall-clock via `Intl` (timezone real) e anexa `-03:00` (offset atual de SP). Documentado; se DST voltar, trocar p/ offset dinâmico. |
| 5 | **LLM ainda emite data errada** apesar do prompt | 8 | `ancorarDataBR` no backend é a rede de segurança (não depende do LLM acertar o offset). |
| 6 | **Regressão silenciosa** em criar_agenda/lembrete (fluxos menos testados) | 9 | Testes unitários por ação (com e sem data); `tsc` + suíte completa; 2 auditores. |

## Gate de saída
`tsc` verde · `yarn test` verde (util + nina.service) · 2 auditores aprovam · STATE/CLAUDE atualizados · deploy do Tiago → validar no orb ("dia 30" → 30/07; "marca reunião" → pergunta o horário).
