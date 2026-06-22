# PREMORTEM — SPEC-003 Módulo Financeiro   (momento: pré-implementação · 2026-06-22)

## Narrativa do fracasso
"Lançamos o módulo. Em uma semana o saldo do Rodrigo apareceu **errado**: uma conta a pagar baixada era contada como saída e ainda havia uma movimentação avulsa duplicando o mesmo valor — saldo dobrado. A Nina voltou a jogar 'entrada de 250' em **recado** porque o prompt foi atualizado só na API e não no n8n (WhatsApp). Ao dizer 'paga a mão de obra' com duas contas parecidas, ela **baixou a errada** sem listar. A migração que trocou `categoria` string por FK **apagou** as categorias antigas. E os botões de confirmação **não apareceram** no WhatsApp do cliente, travando o fluxo sem fallback."

## Riscos (P × I) e mitigação / GO-gate

| # | Risco | P | I | Score | Mitigação |
|---|---|---|---|---|---|
| 1 | **Saldo contado em dobro** (avulso + baixa de título) | 4 | 5 | **20** | Saldo = `somaQuitadas` por status PAGO/RECEBIDO numa **única fonte** (`Conta`); avulso nasce quitado e **não** gera segundo registro; teste unit do saldo com cenário misto |
| 2 | Nina volta a classificar "entrada" como recado | 4 | 4 | **16** | Nova intent `registrar_movimentacao` + **card de confirmação**; sincronizar prompt API **e** n8n; testes de intent com as 5 frases reais |
| 3 | Baixa no **título errado** (descrições parecidas) | 3 | 5 | **15** | Com >1 match, **listar e exigir escolha**; nunca baixar no escuro; confirmação obrigatória |
| 4 | Migração quebra dados (`categoria` string→FK) | 3 | 4 | 12 | Migração **aditiva**: manter coluna `categoria` string; `categoriaId` nullable; `origem` default TITULO p/ contas existentes; backfill opcional depois |
| 5 | Vazamento cross-tenant (dinheiro de A em B) | 2 | 5 | 10 | `requireTenantId()` em toda query nova (Categoria incluída); teste de isolamento cross-tenant; ADR-006 camada 2 |
| 6 | Prompt divergente API × n8n (dois cérebros) | 3 | 3 | 9 | Catálogo único de ações na SPEC; E2E nos dois canais; registrar pendência no STATE |
| 7 | Gravar **sem** confirmação | 2 | 4 | 8 | Ações de gravação retornam `confirmacao`/`pendente`; nada persiste antes do sim/clique; teste |
| 8 | Botões WhatsApp sem suporte → trava | 2 | 3 | 6 | **Fallback texto** "responda 1/2/3"; confirmação funciona sem botões |

## Checklist GO/NO-GO (pré-merge)
- [ ] Teste unit do saldo com cenário misto (avulso + título baixado) bate o esperado, **sem dobra**
- [ ] Isolamento cross-tenant verde no financeiro/categoria
- [ ] As 5 frases reais funcionam (entrada, saída, baixa, saldo, pendências)
- [ ] Migração aditiva testada com dados existentes (nada apagado)
- [ ] Prompt sincronizado API + n8n (ou n8n registrado como pendência no STATE)
- [ ] Fallback de confirmação sem botões funciona
- [ ] type-check + lint + boundaries limpos; sem `any` público

**GO / NO-GO:** _____ (preencher antes do merge)
