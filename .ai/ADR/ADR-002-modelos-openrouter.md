# ADR-002 — Seleção de modelos via OpenRouter (config-driven)   (2026-06-16 · status: aceita)

## Contexto
Meta de economia de tokens com qualidade onde importa. Necessário trocar modelos sem editar workflows.

## Decisão
Tabela `Modelo` mapeia `tarefa → modelo_primario + fallbacks[] + teto_tokens`. 3 tiers definidos pelo Tiago:
- **Fraco:** `nvidia/nemotron-3.5-content-safety:free` — classificação de intenção, consultas simples e **camada de content-safety** (detecção de instrução embutida/jailbreak).
- **Intermediário:** `qwen/qwen3.7-max` — agenda, GTD, financeiro.
- **Premium:** `anthropic/claude-sonnet-4.6` — coach de finanças, ambiguidade, fallback de qualidade.
Fallback automático via array do OpenRouter. Telemetria em `UsoLlm`.

## Alternativas consideradas
- Sonnet para tudo (descartado: custo). Haiku/fraco para tudo (descartado: erra em ambiguidade/datas).

## Consequências
+ Custo controlado e ajustável em runtime. − Roteamento por modelo adiciona lógica no orquestrador.
