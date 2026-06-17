# HARNESS — Sprint 2 Financeiro — 2026-06-16

| Gate | Status | Notas |
|---|---|---|
| Build backend | ✅ | `nest build` OK com FinanceiroModule |
| Integration (API) | ✅ | criar conta (201, 125000c), listar, vencimentos(7d), pagar, fluxo → entradas 0 / saídas 125000 / saldo -125000 |
| Build frontend | ✅ | `next build` com rota `/financeiro` |
| E2E UI (Playwright) | ✅ | login → /financeiro: Saídas R$ 1.250,00, Saldo -R$ 1.250,00, conta "Boleto fornecedor X · pago" |
| Convenção dinheiro | ✅ | centavos (Int) → reais na UI (Intl pt-BR) |

Resultado: **APROVADO**.
