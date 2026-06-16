# ADR-003 — Mecanismo de gatilho (isolamento por self-chat + código)   (2026-06-16 · status: aceita)

## Contexto
A Nina não pode interferir nas conversas do Tiago com terceiros. Risco de vazamento P×I=20.

## Decisão
O workflow só ativa quando: tenant reconhecido **+ self-chat** (`key.fromMe=true` e `remoteJid` = número próprio) **+ gatilho ativo**. Default **modo sessão**: um código/palavra-secreta abre a sessão; por X minutos a Nina responde livre no self-chat; código/`fim` encerra (estado em `Sessao`). Filtro é o **primeiro nó** — mensagens de/para terceiros saem imediatamente, sem LLM e sem gravação.

## Alternativas consideradas
- Prefixo por mensagem (mais chato no dia a dia, vira fallback configurável).
- Número dedicado só pra Nina (descartado por enquanto: Tiago quer o próprio número).

## Consequências
+ Privacidade e economia máximas. − Exige gestão de sessão/expiração; código não pode vazar.
