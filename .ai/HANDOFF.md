# HANDOFF — evo-sec (Nina)   (2026-06-24 · De: Claude → próxima sessão)

## Onde paramos
Sessão grande: **8 SPECs + premortem do sistema**, tudo na `main` e validado E2E em prod (PRs #34–#44). Estado vivo em `.ai/STATE.md` (bloco **🔖 PARADO AQUI** no topo) + `.ai/PREMORTEMS/PREMORTEM-sistema-2026-06-24.md` (25 riscos priorizados).

Entregue nesta sessão: alertas proativos (004), cérebro multi-turno/memória (005), contexto durável (006), fix data/timezone do orb (007), hardening resiliência+rate-limit (008), Onda 1b backup+resiliência n8n (009).

## Release-blockers (Onda 1)
- ✅ **#3 resiliência** — backend (deployado) + n8n (onError+fallback+timeout, no ar).
- ✅ **#2 backup** — EasyPanel nativo, **diário 2h (LOCAL)**; falta **off-site** + testar restore.
- ⏳ **#1 webhook HMAC** — **CRÍTICO, não feito** (SPEC-009 §5: nó fail-open → segredo → Evolution header → validar → flip fail-closed).

## Continuar por (ordem)
1. **#1 webhook** (segurança crítica, live-exploitable hoje).
2. **Backup off-site** (Backblaze B2 grátis → destino no EasyPanel) + **testar restore** num clone.
3. **Onda 2** do premortem: #6 lembrete recorrente (HOJE não dispara — quebrado), #8 tz financeiro, #9 idempotência webhook, #14 observabilidade + alerta de custo LLM. (Onda 3 = multi-tenant: #4/#5/#11.)

## Como trabalhamos (confirmado nesta sessão)
SPEC primeiro → build com **agentes paralelos** (arquivos disjuntos) → **2 auditores por sprint** → Claude faz todo o git (branch→PR→merge). **Deploy:** Claude dispara o webhook do `api` no EasyPanel (Tiago tem o token). **n8n:** Claude edita via MCP, **Tiago publica** (e configura Evolution/EasyPanel). Ver [[tiago-modo-trabalho]] e [[n8n-mcp-fazer-tudo]].

## Comando de retorno (cola no início da próxima sessão)
> "Retomar evo-sec (Nina). Lê `.ai/STATE.md` (bloco 🔖 PARADO AQUI), `.ai/HANDOFF.md` e o premortem `.ai/PREMORTEMS/PREMORTEM-sistema-2026-06-24.md`. Continua: **#1 webhook HMAC** primeiro (crítico), depois **backup off-site** e a **Onda 2** (#6 lembrete recorrente etc.). Eu publico o n8n e configuro EasyPanel/Evolution; você faz o código/git e dispara o deploy."
