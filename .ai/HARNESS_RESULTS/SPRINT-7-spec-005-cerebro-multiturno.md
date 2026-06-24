# HARNESS — SPRINT 7 / SPEC-005 (Cérebro multi-turno + classificação)

> 2026-06-24 · Scrum master: Claude · Workflow `Dqm3pJo2MNHcRZ1R` (draft via MCP, **não publicado**)

## Escopo entregue
Memória de conversa curta + fix de classificação no cérebro da Nina no WhatsApp:
- **Novo nó `Monta Mensagens (memoria)`** (entre as 3 fontes e o `Nina (OpenRouter)`): lê ring buffer das últimas ~8 trocas por `numero` (`getWorkflowStaticData`) e monta o `messages` = `[system, ...histórico(user/assistant), user atual]`.
- **`Nina (OpenRouter)`**: body passou a enviar `messages: $json.messages` (modelo/temperature/max_tokens preservados).
- **`Interpreta Acao`**: após obter `resposta`, faz push de `{user, conteudo:texto}` + `{assistant, conteudo:resposta}` no buffer (cap 8). Bloco `pendingAction` (sim/não) **byte-idêntico**.
- **`Filtro de Gatilho`**: reset do `store.hist[numero]` quando a sessão expira (espelha `sessaoAtivaAte`).
- **Prompt `criar_conta`**: ampliado p/ contas **vencidas/atrasadas em aberto** (antes só "FUTURA") + regra-chave separando explicitamente de `pagar_conta`.

## Provas
- **`validate_workflow`** (build): `{ valid: true }`, zero erros. Workflow **não publicado** (`versionId` do draft ≠ `activeVersionId`).
- **Auditoria (2 agentes) — APROVADO:**
  - **Não-regressão:** 🔴 UTF-8 do regex `n[aã]o` = U+00E3 íntegro (0× U+FFFD, 0 mojibake; o `�` era render do console Windows). 40/43 nós byte-idênticos; pendingAction/sessão/12 ações/roteamento financeiro/multimodal intactos; rewire correto (3 fontes → Monta → Nina → Interpreta), zero órfãos; draft = ativo + 1 nó.
  - **Memória + classificação:** buffer keyed por `numero`, cap 8, reset c/ sessão, só self-chat, sem vazamento; `messages` válido p/ OpenRouter sem dupla contagem; `criar_conta` cobre vencida/em aberto + `(NUNCA pagar_conta)`; outras 12 ações + formato JSON + guardrails (hierarquia + de-branding) verbatim.
  - Menores (não-bloqueadores): buckets de `hist` de números inativos não são podados (cresce devagar — staticData; backend durável resolve no futuro); `numero` depende do nó `Filtro` (read/write coerentes).

## Pendente (Tiago)
1. **Republish** do workflow `Dqm3pJo2MNHcRZ1R` (publish via MCP é bloqueado).
2. **Testar no WhatsApp** (self-chat): (a) conversa multi-turno — "conta de água venceu 20/04" → "155 reais" → deve criar `criar_conta` lembrando do turno 1; (b) "venceu a luz, deixa em aberto" → `criar_conta` (não pagar); (c) cancelar com "não" uma confirmação de pagar/aportar (valida o regex). **Claude confirma via `get_execution` (logs) após o teste.**

## Notas
- ⚠️ Modelo vivo do nó da Nina = `qwen/qwen3.7-plus` (CLAUDE.md/STATE diziam `qwen3.7-max`) — alinhar doc ou workflow.
- Incremento futuro (SPEC-005 §2): persistência durável via backend `Contexto`/`Sessao` + endpoints `POST/GET /nina/contexto` (unifica a voz do app, hoje também stateless).
