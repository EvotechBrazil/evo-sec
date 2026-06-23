# Harness — SPEC-003 Módulo Financeiro   (2026-06-22)

## Gates executados

| Gate | Resultado | Evidência |
|---|---|---|
| Type-check backend | ✅ verde | `tsc --noEmit` EXIT 0 |
| Type-check frontend | ✅ verde (meu código) | 0 erros fora de `.next/types/app/mockups` (lixo stale pré-existente; pasta `mockups` não existe mais) |
| Unit — saldo sem dobra | ✅ 4/4 | `financeiro.service.spec.ts` |
| Integração — migração + seed | ✅ | migração `20260622225327_spec_003_financeiro` aplicada no Postgres; seed 19 categorias |
| E2E REST — smoke real | ✅ | login → +R$250 → −R$150 → saldo R$100 (delta 10000, **sem dobra**) |
| Lint | n/a | projeto não usa ESLint (sem config nem dep) — `tsc` é o gate de tipos |

## Unit — FinanceiroService (4 testes, todos verdes)
1. soma movimentação avulsa + título baixado **SEM contar em dobro** (entrada 25000; saídas 15000+10000; saldo 0)
2. "Sem categoria" + grupo default quando a conta não tem categoria
3. `registrarMovimentacao` ENTRADA → A_RECEBER / RECEBIDO / AVULSO
4. `registrarMovimentacao` SAIDA → A_PAGAR / PAGO / AVULSO + `pagoEm` preenchido

## E2E REST (smoke) — backend dev + Postgres real
Cenário = teste real do Rodrigo (22/06):
```
saldoInicial: 0
+ENTRADA 25000 → origem=AVULSO status=RECEBIDO  ✓
+SAIDA   15000 → origem=AVULSO status=PAGO       ✓
saldoFinal: 10000  (delta=10000 esperado)        ✓ saldoOK=true
categorias: 19                                    ✓
```
Dados de smoke removidos após o teste (soft-delete via API).

## GO-gate do premortem (cobertura)
- [x] Saldo sem dobra (unit + E2E) — risco #1
- [x] Migração aditiva (origem default TITULO; coluna `categoria` string mantida) — dados não apagados
- [x] tenant-scoped (`requireTenantId` em Categoria + RLS `tenant_isolation` na migração)
- [x] Gravação só após confirmação (ações financeiras retornam `confirmacao`/`pendente`)
- [ ] As 5 frases da Nina nos **dois** canais — validado via REST/app; **WhatsApp (n8n) pendente**
- [ ] Fallback de botões sem suporte — implementado (labels mapeiam AFIRMA/NEGA/recado); validar no WhatsApp real

## Pendente (próxima leva)
- **n8n**: sincronizar o prompt do WhatsApp com as novas ações + nós de **botões Evolution** + Publish (o cérebro do WhatsApp ainda usa as 10 ações antigas).
- **ConfirmCard** visual no app (voz `/falar`) — tipo `confirmacao` já exposto no `api.ts`.
- Criar conta a pagar/receber com vencimento **pelo app** (a Nina já cria).
- **Deploy** (a migração roda no boot via `docker-entrypoint.sh`).
