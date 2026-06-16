# n8n — Cérebro da Nina

Orquestração da Nina no n8n: recebe mensagens do WhatsApp (Evolution), isola por gatilho, normaliza (texto/áudio/foto/documento), classifica a intenção e aciona o especialista, que persiste via **API NestJS** (`/api/v1`). Economia de tokens: o que é determinístico não passa por LLM.

## Arquivos
- `prompts/nina-base.md` — identidade + guardrails compartilhados (injetado em todos).
- `prompts/nina-orquestrador.md` — classificador de intenção (tier fraco).
- `prompts/nina-especialistas.md` — prompts por domínio (GTD/Agenda/Consulta/Financeiro/Finanças).
- `workflows/nina-gatilho-filter.code.js` — código do nó Code do **filtro de gatilho** (isolamento self-chat + sessão). **Segurança crítica.**

## Fluxo do workflow principal (nó a nó)
```
1. Webhook (POST)            ← Evolution envia messages.upsert aqui
2. Code: filtro de gatilho   ← nina-gatilho-filter.code.js (retorna [] = ignora terceiros)
3. Switch (tipoMidia)
     ├─ audio      → HTTP: transcrição (provider) → texto
     ├─ imagem/doc → HTTP: visão/OCR (provider)   → texto/estrutura
     └─ texto      → segue
4. (opcional) Code: roteador por regras (regex/keywords) — decide intenção sem LLM
5. HTTP: Orquestrador (OpenRouter, tier fraco) — só se regras não decidirem → {intencoes,...}
6. Switch (intencao) → ramo do especialista:
     - HTTP: LLM especialista (OpenRouter, tier conforme tabela Modelo) com tools
     - HTTP: chamadas à API NestJS (x-service-token + x-tenant-id) para CRUD
     - destrutiva → nó de aprovação (Human Review) antes de executar
7. Code: monta resposta (ecoa dado-chave em texto)
8. HTTP: Evolution sendText  ← responde no WhatsApp
9. HTTP: POST /usos-llm (telemetria de custo)   [opcional]
```

## Credenciais a configurar no n8n
| Credencial | Uso |
|---|---|
| Evolution API (header `apikey`) | receber webhook + enviar mensagens |
| OpenRouter (Bearer `OPENROUTER_API_KEY`) | LLM (orquestrador + especialistas) |
| Backend service token | header `x-service-token` nas chamadas à API NestJS |

## Variáveis (n8n → Settings → Variables)
`TENANT_ID`, `OWN_NUMBER` (ex: 5543999864409), `GATILHO_CODIGO` (ex: nina), `SESSAO_MINUTOS` (ex: 30),
`API_BASE` (ex: http://backend:3001/api/v1), `SERVICE_TOKEN`, `OPENROUTER_API_KEY`.

## Modelos (OpenRouter — vêm da tabela `Modelo` por tarefa)
- Fraco: `nvidia/nemotron-3.5-content-safety:free` (classificar + content-safety)
- Intermediário: `qwen/qwen3.7-max`
- Premium: `anthropic/claude-sonnet-4.6`

## Setup no Evolution
Aponte o webhook da instância para `POST {N8N_WEBHOOK_URL}/webhook/nina` no evento `MESSAGES_UPSERT`.
O filtro de gatilho garante que apenas **suas próprias** mensagens (self-chat) com o código/sessão acionem a Nina — conversas com terceiros passam intactas.

> O JSON importável do workflow é gerado/refinado na instância via n8n-mcp (nós com `typeVersion` corretos). Este guia + o código do filtro + os prompts são a fonte de verdade do design.
