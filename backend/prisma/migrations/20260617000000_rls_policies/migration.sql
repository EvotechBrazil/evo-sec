-- RLS (Row-Level Security) camada 2 — isolamento por tenant no banco (ADR-001/ADR-006).
-- Política: linha visível apenas quando tenant_id = current_setting('app.current_tenant').
-- O PrismaService.withTenant() seta esse GUC por transação.
-- NÃO usa FORCE: o owner das tabelas (conexão atual da app) ainda enxerga tudo — a
-- enforcement real ocorre quando a app conectar com um role não-owner (ver ADR-006).
-- A camada 1 (filtro por tenantId em todo repositório) já está ativa hoje.

DO $$
DECLARE
  t text;
  tabelas text[] := ARRAY[
    'users','recados','tarefas','lembretes','compromissos','contas',
    'metas_financeiras','investimentos','contatos_vip','configs',
    'sessoes','contextos','modelos','usos_llm','midias'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting(''app.current_tenant'', true)::uuid)',
      t
    );
  END LOOP;
END $$;
