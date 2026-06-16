# ADR-005 — Recorrência da agenda nativa (regra + expansão na leitura)   (2026-06-16 · status: aceita)

## Contexto
Agenda nativa em Postgres precisa do que o Google Calendar oferece, incluindo eventos recorrentes, sem materializar milhares de linhas.

## Decisão
Guardar a **regra de recorrência** (rrule-like) no `Compromisso` e **expandir as ocorrências na leitura**, dentro de uma janela consultada (dia/semana/mês). Exceções (ocorrência editada/cancelada) ficam como linhas-filho ligadas por `recorrencia_pai_id`. Conflito/disponibilidade usa `tstzrange` + índice GiST sobre as ocorrências expandidas na janela.

## Alternativas consideradas
- Materializar todas as ocorrências (descartado: explosão de linhas, manutenção difícil).

## Consequências
+ Armazenamento enxuto e flexível. − Lógica de expansão e tratamento de exceções na camada de leitura.
