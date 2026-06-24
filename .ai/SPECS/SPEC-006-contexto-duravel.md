# SPEC-006 — Memória conversacional durável no backend (Contexto/Sessao + endpoints)

> Status: **EM IMPLEMENTAÇÃO** (Sprint 8) · Scrum master: Claude · 2026-06-24
> Depende de: SPEC-005 (memória multi-turno provada no n8n via staticData — aqui a tornamos durável e disponível à voz do app).

## 1. Objetivo
A memória multi-turno da Nina hoje vive no **staticData do n8n** (some num restart; só serve o WhatsApp). Os models **`Contexto`/`Sessao` existem no schema mas estão órfãos** (ninguém grava/lê). Esta SPEC liga essas tabelas com service + repository + endpoints tenant-scoped, e **pluga a memória na voz do app** (`nina.service.processar`, hoje stateless) — tornando o contexto **durável** e **compartilhado** entre canais.

## 2. Escopo
- **Persistência** (`ContextoModule`/dentro do `NinaModule`): `ContextoService` + `ContextoRepository` sobre os models existentes (**sem migração** — `sessoes`/`contextos` já existem; `Contexto.sessaoId` é string solta, suficiente).
  - **Sessão ativa por tenant** (janela deslizante de 30 min): get-or-create — pega a `Sessao` `ativa=true` com `expiraEm > agora`; se não há, cria (`ativa=true`, `abertaEm=agora`, `expiraEm=agora+30min`). Cada `registrar` estende `expiraEm`. Sessão expirada → nova sessão (contexto antigo não vaza).
  - `historico(limite=8): ChatMsg[]` — últimas N mensagens (`Contexto`) da sessão ativa, em ordem **cronológica** (`role:'user'|'assistant'`, `conteudo`).
  - `registrar(role, conteudo): void` — append de `Contexto` na sessão ativa (get-or-create + estende a janela).
- **Endpoints** (`/api/v1/nina/contexto`, tenant-scoped — JWT ou x-service-token+x-tenant-id):
  - `GET /nina/contexto?limite=N` → `{ data: { mensagens: ChatMsg[] } }` (default 8, teto 30).
  - `POST /nina/contexto` `{ role:'user'|'assistant', conteudo }` → grava (p/ o n8n adotar depois).
- **Adapter** (`OpenRouterAdapter.intent`): aceitar `historico?: ChatMsg[]` e injetar como pares `user`/`assistant` no `messages` **entre o `system` e a mensagem atual** (backward-compatible).
- **Voz do app** (`nina.service.processar`): no caminho de NLU, carregar `historico` antes do `intent`, passá-lo, e após a resposta **gravar** `registrar('user', texto)` + `registrar('assistant', resposta)`.

**Fora de escopo (follow-up):** migrar o cérebro WhatsApp (n8n) do staticData p/ estes endpoints (já funciona via staticData); FK real `Contexto→Sessao` (exigiria migração); poda/retention job.

## 3. Contrato
```ts
export interface ChatMsg { role: 'user' | 'assistant'; conteudo: string; }
// ContextoService.historico(limite=8): Promise<ChatMsg[]>   (cronológico)
// ContextoService.registrar(role: 'user'|'assistant', conteudo: string): Promise<void>
// OpenRouterAdapter.intent(texto, nowIso, historico?: ChatMsg[]): Promise<IntentResult>
```

## 4. Critérios de aceite (verificáveis)
- [ ] `GET /nina/contexto` e `POST /nina/contexto` existem, **tenant-scoped** (toda query via `requireTenantId()`).
- [ ] `historico(N)` devolve as últimas N da **sessão ativa** em ordem cronológica; sessão **expirada (30 min)** → começa nova, **contexto antigo não aparece**.
- [ ] `registrar` cria `Contexto` na sessão ativa e **estende** `Sessao.expiraEm` (get-or-create idempotente).
- [ ] **Voz do app multi-turno:** `nina.service.processar` carrega o histórico, passa ao `intent`, e grava user+assistant — duas chamadas seguidas mantêm contexto.
- [ ] `intent` com `historico` monta `messages = [system, ...histórico(user/assistant), user atual]`; sem histórico = comportamento atual (compatível).
- [ ] **Multi-tenant:** nenhuma sessão/contexto vaza entre tenants (toda leitura/escrita filtra `tenantId`).
- [ ] **Sem migração** (tabelas já existem) — confirmar que `prisma.sessao`/`prisma.contexto` existem no client. Sem `any` público; `tsc` verde; `yarn test` verde.

## 5. Harness
- **Unit** (`ContextoService`/`Repository` mockando Prisma): get-or-create de sessão, expiração (janela vencida → nova), `historico` ordem+limite, `registrar` estende janela, **guarda de tenant** (sem contexto → lança; com → filtra `tenantId`).
- **Adapter:** `intent` injeta histórico no `messages` na ordem certa; sem histórico = `[system,user]`.
- **nina.service:** `processar` chama `historico` antes do `intent` e `registrar` depois (mock do ContextoService) — multi-turno.
- **E2E REST opcional** (Postgres dev): login → POST 2 mensagens → GET → ordem certa; 2 `/nina/mensagem` seguidas mantêm contexto.
- Resultado em `.ai/HARNESS_RESULTS/SPRINT-8-spec-006-contexto-duravel.md`.

## 6. Riscos → `PREMORTEM-spec-006-contexto-duravel.md`
