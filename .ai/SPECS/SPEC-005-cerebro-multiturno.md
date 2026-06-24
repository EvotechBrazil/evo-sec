# SPEC-005 — Cérebro da Nina (WhatsApp): memória multi-turno + classificação de conta atrasada

> Status: **EM IMPLEMENTAÇÃO** (Sprint 7) · Scrum master: Claude · 2026-06-24
> Workflow alvo: `Dqm3pJo2MNHcRZ1R` (`Nina — Principal (WhatsApp)`, 43 nós). Mudança via MCP; **publish manual do Tiago**.

## 1. Problema (causa-raiz, do diagnóstico)
A Nina **perde o contexto entre mensagens** (slot-filling multi-turno quebra). Conversa real que falhou: "conta de água venceu 20/04" → "qual o valor?" → "155 reais" → a Nina **esqueceu** que era a conta de água e perguntou o tipo de novo; depois confundiu "atrasada/em aberto" com "pagar".
- **Causa 1 (memória):** o nó `Nina (OpenRouter)` recebe **só a mensagem atual** (`$json.texto`) — nenhum histórico. Evidência ao vivo (exec 704): o reasoning do qwen diz *"I don't have the context of the previous question"*; `prompt_tokens: 898`. Os models `Contexto`/`Sessao` existem no schema mas estão **órfãos**.
- **Causa 2 (classificação):** o prompt define `criar_conta` como *"FUTURA com vencimento"* → uma conta **vencida e ainda não paga** cai num vão (não é futura, não é "paguei") → o modelo oscila entre `pagar_conta` e `conversa`.

## 2. Escopo (somente o workflow do WhatsApp)
1. **Memória multi-turno** (no n8n, via `getWorkflowStaticData('global')`): manter um **ring buffer das últimas ~8 trocas por `numero`** (`{role:'user'|'assistant', conteudo}`), preso à janela de sessão (mesmo `expira` do `sessaoAtivaAte`). Injetar esse histórico como **pares `user`/`assistant`** no `messages` enviado ao `Nina (OpenRouter)` (entre o `system` e a mensagem atual).
2. **Prompt — `criar_conta`**: redefinir para cobrir contas **vencidas/atrasadas em aberto** (não só futuras) e **separar explicitamente de `pagar_conta`**. Regra-chave reforçada: *"'venceu/atrasada/em aberto/deixa anotada' + ainda não paga = criar_conta; 'paguei/quitei/dar baixa' = pagar_conta."*

**Fora de escopo (incrementos futuros):** persistência durável via backend `Contexto`/`Sessao` + endpoints (`POST/GET /nina/contexto`) que unificaria WhatsApp + voz do app (`nina.service.ts` também é stateless hoje). staticData é o "mínimo robusto"; o backend é o "robusto durável".

## 3. Critérios de aceite (verificáveis)
- [ ] **Multi-turno:** turno 1 "conta de água venceu 20/04" → pede o valor (`conversa`); turno 2 "155 reais" → emite `criar_conta {tipo:A_PAGAR, descricao:"conta de água", valorCentavos:15500, vencimento:"2026-04-20"}` — **lembrando do turno 1**.
- [ ] **Classificação:** "atrasada/em aberto/deixa anotada" + não paga → `criar_conta` (NUNCA `pagar_conta`); "paguei/quitei" → `pagar_conta`.
- [ ] **Não-regressão:** isolamento por gatilho (self-chat + sessão), `pendingAction` (confirmação sim/não de pagar/aportar/cancelar), as 12 ações e o roteamento financeiro continuam funcionando.
- [ ] **Memória limitada:** buffer cap ~8 trocas, por `numero`, expira junto com a sessão; só self-chat alimenta o buffer.
- [ ] **Multimodal intacto:** o caminho de áudio/foto (Gemini) não quebra.
- [ ] `validate_workflow` → zero erros. Workflow **não publicado** (Tiago republica).

## 4. Harness (provas)
- **Execução simulada via MCP** (`execute_workflow` com webhookData self-chat) numa sequência multi-turno ("conta de água venceu 20/04" → "155 reais"), inspecionando a saída do nó `Nina (OpenRouter)` / `Interpreta Acao`: o turno 2 deve sair `criar_conta` com os dados certos (prova que o histórico entrou no prompt). *(Pode criar uma conta de teste — anotar p/ excluir.)*
- **Teste real no WhatsApp (Tiago)** após republish: repetir a conversa da conta de água em vários turnos e ver a Nina manter o fio.
- 2 auditores (n8n/não-regressão + classificação/guardrails). Resultado em `.ai/HARNESS_RESULTS/SPRINT-7-spec-005-cerebro-multiturno.md`.

## 5. Riscos → ver `PREMORTEM-spec-005-cerebro-multiturno.md`
