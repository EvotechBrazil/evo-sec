# Deploy — evo-sec (Nina)

Arquitetura em produção (3 peças):

```
WhatsApp (Evolution) → n8n (nuvem) → API NestJS (pública) → Postgres
                                          ↑
                        Frontend (Vercel) ┘  via REST /api/v1
```

A **Vercel hospeda só o frontend**. A API NestJS e o Postgres ficam fora dela.
A URL pública da API (`API_BASE`) é o que destrava **tanto** o dashboard com dados reais
**quanto** a Nina persistir no banco pelo n8n.

---

## 1. Postgres (gerenciado)
Opções: **Neon**, **Supabase** ou **Railway** (ou container na VPS).
- Crie o banco, copie a connection string → vira `DATABASE_URL` da API.
- Provedores gerenciados normalmente exigem `?sslmode=require`.

## 2. API NestJS (host com servidor persistente)
A Vercel **não** serve bem (long-running + socket.io). Use **Railway**, **Render** ou **VPS (Docker)**.
1. Variáveis de ambiente: ver `backend/.env.example` (DATABASE_URL, JWT_*, SERVICE_TOKEN, ENCRYPTION_KEY…).
2. Build/start: `yarn install && yarn build && yarn start:prod` (ou Docker).
3. Migrar + seed: `yarn prisma migrate deploy && yarn seed`.
4. Anote a URL pública, ex.: `https://api.seudominio.com` → `API_BASE`.
5. CORS já está liberado (`origin: true` em `src/main.ts`); restrinja ao domínio da Vercel quando estabilizar.

## 3. Frontend (Vercel)
1. Importar o repo `EvotechBrazil/evo-sec` na Vercel.
2. **Root Directory:** `frontend` (monorepo — backend e frontend no mesmo repo).
3. Framework **Next.js** (autodetectado). Build `next build` (padrão).
4. Environment Variable:
   - `NEXT_PUBLIC_API_URL = https://API_BASE/api/v1`  (com `/api/v1` no fim).
5. Deploy → testar login (`rodrigo@crossfitarapongas.com.br`).

## 4. n8n (persistência da Nina)
Com a API pública no ar:
1. Definir `API_BASE` (HTTP Request nodes ou variável do workflow).
2. Adicionar a **camada de tools**: nós chamando `POST {API_BASE}/api/v1/recados | tarefas | financeiro/contas | …`
   com headers `x-service-token: $SERVICE_TOKEN` + `x-tenant-id: <tenant do Rodrigo>`.
3. A Nina passa a confirmar com o **id real** já gravado (não só "anotado").

---

## Checklist GO/NO-GO
- [ ] `DATABASE_URL` apontando p/ Postgres gerenciado, `migrate deploy` rodado, seed ok.
- [ ] API respondendo em `https://API_BASE/api/v1/auth/login`.
- [ ] Segredos trocados (JWT_*, SERVICE_TOKEN, ENCRYPTION_KEY) — nada de valores de dev.
- [ ] Vercel com `NEXT_PUBLIC_API_URL` correto; login funcionando.
- [ ] CORS restrito ao domínio da Vercel.
- [ ] n8n com `API_BASE` + `SERVICE_TOKEN`; tools persistindo (teste E2E: "nina, anota X" → linha no banco).
- [ ] RLS camada 2 (ADR-006) avaliada antes de tráfego real.
