import { CategoriaTipo, GrupoDre } from '@prisma/client';

export interface CategoriaSeed {
  nome: string;
  tipo: CategoriaTipo;
  grupoDre: GrupoDre;
}

/**
 * Plano de contas enxuto (ADR-007 · ref. docs/skills-contadores/31,32,39).
 * Seedado como `isSystem` por tenant; o tenant pode criar/editar/desativar as próprias.
 * Fonte única reusada pelo seed e pelo CategoriasService.garantirPadrao().
 */
export const CATEGORIAS_PADRAO: CategoriaSeed[] = [
  // Receitas
  { nome: 'Vendas de produtos', tipo: CategoriaTipo.RECEITA, grupoDre: GrupoDre.VENDA },
  { nome: 'Prestação de serviços', tipo: CategoriaTipo.RECEITA, grupoDre: GrupoDre.VENDA },
  { nome: 'Rendimentos recebidos', tipo: CategoriaTipo.RECEITA, grupoDre: GrupoDre.FINANCEIRO },
  { nome: 'Outras receitas', tipo: CategoriaTipo.RECEITA, grupoDre: GrupoDre.EXTRAORDINARIA },
  // Custos diretos (o que sai do bolso pra gerar a receita)
  { nome: 'Fornecedores / mercadorias', tipo: CategoriaTipo.DESPESA, grupoDre: GrupoDre.CUSTO_DIRETO },
  { nome: 'Insumos / materiais', tipo: CategoriaTipo.DESPESA, grupoDre: GrupoDre.CUSTO_DIRETO },
  { nome: 'Mão de obra / serviços terceiros', tipo: CategoriaTipo.DESPESA, grupoDre: GrupoDre.CUSTO_DIRETO },
  // Pessoal
  { nome: 'Salários / pró-labore', tipo: CategoriaTipo.DESPESA, grupoDre: GrupoDre.PESSOAL },
  { nome: 'Encargos (INSS/FGTS)', tipo: CategoriaTipo.DESPESA, grupoDre: GrupoDre.PESSOAL },
  // Despesas fixas / operacionais
  { nome: 'Aluguel', tipo: CategoriaTipo.DESPESA, grupoDre: GrupoDre.DESPESA_FIXA },
  { nome: 'Energia / água / internet', tipo: CategoriaTipo.DESPESA, grupoDre: GrupoDre.DESPESA_FIXA },
  { nome: 'Combustível / transporte', tipo: CategoriaTipo.DESPESA, grupoDre: GrupoDre.DESPESA_FIXA },
  { nome: 'Marketing / publicidade', tipo: CategoriaTipo.DESPESA, grupoDre: GrupoDre.DESPESA_FIXA },
  { nome: 'Manutenção / reparos', tipo: CategoriaTipo.DESPESA, grupoDre: GrupoDre.DESPESA_FIXA },
  { nome: 'Material de escritório', tipo: CategoriaTipo.DESPESA, grupoDre: GrupoDre.DESPESA_FIXA },
  // Tributos
  { nome: 'DAS / impostos', tipo: CategoriaTipo.DESPESA, grupoDre: GrupoDre.TRIBUTO },
  // Financeiro
  { nome: 'Tarifas bancárias', tipo: CategoriaTipo.DESPESA, grupoDre: GrupoDre.FINANCEIRO },
  { nome: 'Juros / multas pagos', tipo: CategoriaTipo.DESPESA, grupoDre: GrupoDre.FINANCEIRO },
  // Extraordinária
  { nome: 'Outras despesas', tipo: CategoriaTipo.DESPESA, grupoDre: GrupoDre.EXTRAORDINARIA },
];
