import {
  Categoria,
  CategoriaTipo,
  ContaOrigem,
  ContaStatus,
  ContaTipo,
  GrupoDre,
  Recorrencia,
} from '@prisma/client';
import { FinanceiroService } from './financeiro.service';
import { ContaComCategoria, FinanceiroRepository } from './financeiro.repository';

const cat = (nome: string, tipo: CategoriaTipo, grupoDre: GrupoDre): Categoria => ({
  id: `cat-${nome}`,
  tenantId: 't1',
  nome,
  tipo,
  grupoDre,
  isSystem: true,
  ativo: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
});

const conta = (over: Partial<ContaComCategoria>): ContaComCategoria => ({
  id: 'c1',
  tenantId: 't1',
  tipo: ContaTipo.A_PAGAR,
  descricao: 'x',
  categoria: null,
  categoriaId: null,
  categoriaRef: null,
  valorCentavos: 0,
  vencimento: new Date('2026-06-10'),
  recorrencia: Recorrencia.NENHUMA,
  status: ContaStatus.PAGO,
  pagoEm: new Date('2026-06-10'),
  contraparte: null,
  origem: ContaOrigem.AVULSO,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...over,
});

describe('FinanceiroService', () => {
  let service: FinanceiroService;
  let repo: {
    quitadasNoPeriodo: jest.Mock;
    somaPendentes: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(() => {
    repo = {
      quitadasNoPeriodo: jest.fn(),
      somaPendentes: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({}),
    };
    service = new FinanceiroService(repo as unknown as FinanceiroRepository);
  });

  describe('resumo()', () => {
    it('soma movimentação avulsa + título baixado SEM contar em dobro', async () => {
      repo.quitadasNoPeriodo.mockResolvedValue([
        conta({
          tipo: ContaTipo.A_RECEBER,
          status: ContaStatus.RECEBIDO,
          origem: ContaOrigem.AVULSO,
          valorCentavos: 25000,
          categoriaRef: cat('Vendas de produtos', CategoriaTipo.RECEITA, GrupoDre.VENDA),
        }),
        conta({
          tipo: ContaTipo.A_PAGAR,
          status: ContaStatus.PAGO,
          origem: ContaOrigem.AVULSO,
          valorCentavos: 15000,
          categoriaRef: cat('Mão de obra / serviços terceiros', CategoriaTipo.DESPESA, GrupoDre.CUSTO_DIRETO),
        }),
        conta({
          tipo: ContaTipo.A_PAGAR,
          status: ContaStatus.PAGO,
          origem: ContaOrigem.TITULO,
          valorCentavos: 10000,
          categoriaRef: cat('Aluguel', CategoriaTipo.DESPESA, GrupoDre.DESPESA_FIXA),
        }),
      ]);

      const r = await service.resumo();

      expect(r.entradasCentavos).toBe(25000);
      expect(r.saidasCentavos).toBe(25000); // 15000 + 10000, cada conta contada UMA vez
      expect(r.saldoCentavos).toBe(0);
      expect(r.porCategoria).toHaveLength(3);
      const maoDeObra = r.porCategoria.find((c) => c.chave.includes('Mão de obra'));
      expect(maoDeObra?.totalCentavos).toBe(15000);
    });

    it('usa "Sem categoria" e grupo default quando a conta não tem categoria', async () => {
      repo.quitadasNoPeriodo.mockResolvedValue([
        conta({ tipo: ContaTipo.A_PAGAR, status: ContaStatus.PAGO, valorCentavos: 5000, categoriaRef: null }),
      ]);
      const r = await service.resumo();
      expect(r.saidasCentavos).toBe(5000);
      expect(r.porCategoria[0].chave).toBe('Sem categoria');
    });
  });

  describe('registrarMovimentacao()', () => {
    it('ENTRADA nasce quitada como A_RECEBER / RECEBIDO / AVULSO', async () => {
      await service.registrarMovimentacao({ tipo: 'ENTRADA', descricao: 'venda', valorCentavos: 25000 });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: ContaTipo.A_RECEBER,
          status: ContaStatus.RECEBIDO,
          origem: ContaOrigem.AVULSO,
          valorCentavos: 25000,
        }),
      );
    });

    it('SAIDA nasce quitada como A_PAGAR / PAGO / AVULSO com pagoEm preenchido', async () => {
      await service.registrarMovimentacao({ tipo: 'SAIDA', descricao: 'mão de obra', valorCentavos: 15000 });
      const arg = repo.create.mock.calls[0][0];
      expect(arg.tipo).toBe(ContaTipo.A_PAGAR);
      expect(arg.status).toBe(ContaStatus.PAGO);
      expect(arg.origem).toBe(ContaOrigem.AVULSO);
      expect(arg.pagoEm).toBeInstanceOf(Date);
    });
  });
});
