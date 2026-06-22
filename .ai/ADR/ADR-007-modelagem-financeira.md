# ADR-007 — Modelagem do módulo financeiro (caixa + título unificados)   (2026-06-22 · status: aceita)

## Contexto
A SPEC-003 precisa cobrir dois conceitos: **movimentação avulsa de caixa** (dinheiro que já entrou/saiu, sem vencimento) e **título** (conta a pagar/receber com vencimento, que aguarda baixa). Duas opções: (A) reaproveitar o model `Conta` existente; (B) criar tabela `Movimentacao` separada. A `Conta` já tem `tipo` (A_PAGAR/A_RECEBER), `status`, `vencimento`, baixa (`pagoEm`) e o cálculo de saldo (`somaQuitadas` por status quitado). `categoria` hoje é `String?` livre, sem natureza para relatório.

## Decisão
1. **Opção A — `Conta` unificada.** Adicionar `origem: ContaOrigem (AVULSO | TITULO)`. Avulso nasce **já quitado** (status PAGO/RECEBIDO, `pagoEm`=agora, `vencimento`=hoje); título nasce PENDENTE com vencimento. **Saldo = soma de uma única fonte** (contas quitadas), eliminando a redundância/dobra que a tabela separada criaria ao baixar um título (mesmo dinheiro em dois lugares).
2. **Categoria como tabela** `Categoria` tenant-scoped (não enum): `{ nome, tipo (RECEITA|DESPESA), grupoDre, isSystem, ativo }`, seedada com o plano de contas enxuto (ref. `docs/skills-contadores/31,32,39`). `grupoDre` alimenta a DRE gerencial. O tenant pode criar/editar/desativar as próprias → evolui **sem deploy**. `Conta.categoriaId` é FK **opcional**; a coluna `categoria` string é mantida (legado/backfill).
3. **Regime de caixa**: receita/despesa contam na data do pagamento (`pagoEm`), não no vencimento — alinha MEI/Simples e a realidade do fluxo (ref. `docs/skills-contadores/40`).
4. **Confirmação desacoplada do canal**: `/nina/mensagem` devolve `confirmacao` (intenção + opções neutras); WhatsApp (Evolution buttons) e app (`<ConfirmCard>`) renderizam. Trocar/adicionar canal não toca a regra.

## Consequências
**+** Uma fonte de verdade pro saldo; reaproveita `FinanceiroService`/repo existentes; categorias flexíveis com DRE pronta; canal plugável.
**−** `Conta` acumula dois conceitos (mitigado por `origem`); migração precisa de default `origem=TITULO` p/ dados existentes; **baixa parcial** (tabela `Pagamento`) fica para a Fase 2; múltiplas carteiras/contas bancárias **não** suportadas agora (decisão consciente, migrável depois).
