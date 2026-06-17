// Dados de exemplo compartilhados pelos mockups (preto + amarelo).
// Não usa API — valores fixos só para preview visual.

export const usuario = { nome: 'Tiago', saudacao: 'Boa tarde' };

export const agenda = [
  { id: '1', titulo: 'Treino CrossFit (turma 18h)', hora: '18:00', local: 'Box Arapongas', tag: 'CrossFit' },
  { id: '2', titulo: 'Call com fornecedor SuperNet', hora: '14:30', local: 'Online', tag: 'Evotech' },
  { id: '3', titulo: 'Reunião financeira mensal', hora: '16:00', local: 'Escritório', tag: 'Pessoal' },
];

export const recados = [
  { id: '1', conteudo: 'João (SuperNet) quer orçamento do link dedicado', remetente: 'João', categoria: 'Evotech', prioridade: 'ALTA' as const },
  { id: '2', conteudo: 'Confirmar pagamento do aluguel do box', remetente: null, categoria: 'CrossFit', prioridade: 'NORMAL' as const },
  { id: '3', conteudo: 'Aniversário da Marina é quinta', remetente: 'Mãe', categoria: 'Pessoal', prioridade: 'BAIXA' as const },
];

export const aguardando = [
  { id: '1', titulo: 'Proposta do contador', de: 'Contador', prazo: 'amanhã' },
  { id: '2', titulo: 'Retorno do banco sobre crédito', de: 'Gerente', prazo: '3 dias' },
];

// valores em centavos (padrão do projeto: dinheiro = inteiro de centavos)
export const financeiro = {
  saldoCentavos: 4_287_50,
  entradasCentavos: 12_500_00,
  saidasCentavos: 8_212_50,
  variacaoPct: 12.4,
  contas: [
    { id: '1', descricao: 'Mensalidades CrossFit', tipo: 'A_RECEBER' as const, valorCentavos: 8_400_00, vence: 'hoje', categoria: 'CrossFit' },
    { id: '2', descricao: 'Aluguel do box', tipo: 'A_PAGAR' as const, valorCentavos: 3_200_00, vence: 'amanhã', categoria: 'CrossFit' },
    { id: '3', descricao: 'Servidores Evotech (cloud)', tipo: 'A_PAGAR' as const, valorCentavos: 1_180_00, vence: '3 dias', categoria: 'Evotech' },
    { id: '4', descricao: 'Consultoria Evotech', tipo: 'A_RECEBER' as const, valorCentavos: 4_100_00, vence: '5 dias', categoria: 'Evotech' },
  ],
  // série dos últimos 7 dias (saldo em reais) para mini-gráficos
  serie: [3200, 3380, 3120, 3950, 3710, 4020, 4287],
};

export const metas = [
  { id: '1', nome: 'Reserva de emergência', atualCentavos: 18_000_00, alvoCentavos: 30_000_00, pct: 60 },
  { id: '2', nome: 'Equipamentos novos do box', atualCentavos: 7_500_00, alvoCentavos: 15_000_00, pct: 50 },
  { id: '3', nome: 'Viagem em família', atualCentavos: 2_400_00, alvoCentavos: 12_000_00, pct: 20 },
];

export const custo = {
  custoUsd: 1.84,
  tokensIn: 184_320,
  tokensOut: 42_110,
  porModelo: [
    { modelo: 'qwen/qwen3.7-max', custoUsd: 1.21, pct: 66 },
    { modelo: 'claude-sonnet-4.6', custoUsd: 0.52, pct: 28 },
    { modelo: 'nemotron-safety', custoUsd: 0.11, pct: 6 },
  ],
};

export const brl = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
