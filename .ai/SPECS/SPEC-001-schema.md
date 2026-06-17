SPEC-ID: SPEC-001
Nome: Schema de dados (Prisma, multi-tenant) — Nina
Projeto: evo-sec
Prioridade: P1
Status: draft

## Objetivo de negócio
Persistir, com isolamento por tenant, tudo que a Nina captura/gerencia: recados, tarefas/GTD, agenda nativa, financeiro pessoal, coach de finanças, memória conversacional, config do gatilho e telemetria de LLM.

## Usuário afetado
Rodrigo (1º tenant) e contas futuras.

## Problema
Sem um schema canônico, multi-tenant e seguro, não há base para a API nem para a dashboard.

## Resultado esperado
`schema.prisma` + migração inicial aplicada em Postgres 16, com RLS por `tenantId` e seed do tenant do Rodrigo.

## Fora de escopo
Lógica de negócio (fica nos services), workflows n8n, telas.

## Critérios de aceite
- [ ] Todas as entidades do §7 do MASTERPLAN modeladas com `tenantId`, UUID, timestamps, soft delete (`deletedAt`).
- [ ] Dinheiro como inteiro de centavos (`Int`/`BigInt`), nunca float.
- [ ] Colunas `snake_case` via `@map`; models `PascalCase`.
- [ ] Índices compostos por tenant nas tabelas de consulta frequente.
- [ ] RLS: policies PostgreSQL por `tenantId` + middleware Prisma + teste de isolamento cross-tenant.
- [ ] Agenda: suporte a `tstzrange`/exclusão de sobreposição (conflito) e regra de recorrência.
- [ ] `migrate dev` roda limpo; `prisma generate` sem erro; seed do tenant Rodrigo.

## Casos de borda
- Recorrência de compromisso (expansão na leitura — ver ADR-005).
- Conta recorrente (salário/gasto fixo) gerando próxima ocorrência.
- Sessão do gatilho expirada.

## Requisitos técnicos
Prisma + Postgres 16. Entidades: Tenant, Recado, Tarefa, Lembrete, Compromisso, Conta, MetaFinanceira, Investimento, ContatoVip, Config, Sessao, Contexto, Modelo, UsoLlm, Midia.

## Riscos
Vazamento entre tenants (RLS); erro de arredondamento (centavos). Ver PREMORTEM.

## Agentes necessários
DB/Prisma (build) + Security e Standards (auditoria).

## Harness necessário
Migração limpa · teste de isolamento cross-tenant · teste de conflito de agenda · soma de centavos.

## Premortem obrigatório: sim
