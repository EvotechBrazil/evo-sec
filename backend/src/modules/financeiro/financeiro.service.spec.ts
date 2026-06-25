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
import { CreateContaDto } from './dto/create-conta.dto';
import { fmtData } from '../resumo/format.util';

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
  idempotencyKey: null,
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
    vencimentos: jest.Mock;
    tenantTimezone: jest.Mock;
  };

  beforeEach(() => {
    repo = {
      quitadasNoPeriodo: jest.fn().mockResolvedValue([]),
      somaPendentes: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({}),
      vencimentos: jest.fn().mockResolvedValue([]),
      tenantTimezone: jest.fn().mockResolvedValue('America/Sao_Paulo'),
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

  describe('idempotência (SPEC-013)', () => {
    it('registrarMovimentacao repassa a idempotencyKey ao repo.create', async () => {
      await service.registrarMovimentacao({
        tipo: 'ENTRADA',
        descricao: 'venda',
        valorCentavos: 25000,
        idempotencyKey: 'evt-123',
      });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ idempotencyKey: 'evt-123' }),
      );
    });

    it('registrarMovimentacao sem chave → idempotencyKey null (comportamento atual)', async () => {
      await service.registrarMovimentacao({ tipo: 'ENTRADA', descricao: 'venda', valorCentavos: 25000 });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ idempotencyKey: null }),
      );
    });

    it('create repassa a idempotencyKey ao repo.create (preservando vencimento tz)', async () => {
      await service.create({
        tipo: ContaTipo.A_PAGAR,
        descricao: 'aluguel',
        valorCentavos: 100,
        vencimento: '2026-06-30',
        idempotencyKey: 'evt-456',
      } as unknown as CreateContaDto);
      const arg = repo.create.mock.calls[0][0];
      expect(arg.idempotencyKey).toBe('evt-456');
      // Não regrediu o tz da SPEC-011: vencimento date-only ancorado ao meio-dia local.
      expect(arg.vencimento.toISOString()).toBe('2026-06-30T15:00:00.000Z');
    });

    it('create sem chave → idempotencyKey null (comportamento atual)', async () => {
      await service.create({
        tipo: ContaTipo.A_PAGAR,
        descricao: 'aluguel',
        valorCentavos: 100,
        vencimento: '2026-06-30',
      } as unknown as CreateContaDto);
      expect(repo.create.mock.calls[0][0].idempotencyKey).toBeNull();
    });
  });

  describe('timezone (SPEC-011)', () => {
    const SP = 'America/Sao_Paulo';
    afterEach(() => jest.useRealTimers());

    it('resumo() default: 1º do mês no fuso do tenant, não UTC', async () => {
      // 2026-06-01T01:00:00Z = 31/05 22h em SP → mês corrente é MAIO (não junho)
      jest.useFakeTimers().setSystemTime(new Date('2026-06-01T01:00:00Z'));
      await service.resumo();
      const [inicio, fim] = repo.quitadasNoPeriodo.mock.calls[0];
      expect(inicio.toISOString()).toBe('2026-05-01T03:00:00.000Z'); // 1 maio 00:00 SP
      expect(fim.toISOString()).toBe('2026-06-01T01:00:00.000Z'); // "agora"
    });

    it('resumo() com inicio/fim date-only → bordas do dia local', async () => {
      await service.resumo('2026-06-10', '2026-06-20');
      const [inicio, fim] = repo.quitadasNoPeriodo.mock.calls[0];
      expect(inicio.toISOString()).toBe('2026-06-10T03:00:00.000Z'); // 10/06 00:00 SP
      expect(fim.toISOString()).toBe('2026-06-21T03:00:00.000Z'); // fim do dia 20 = 21/06 00:00 SP
    });

    it('vencimentos(dias): janela até o fim do dia local, não now+N*24h cru', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-06-15T12:00:00Z')); // 09:00 SP
      await service.vencimentos(7);
      const [ate] = repo.vencimentos.mock.calls[0];
      // alvo = 22/06 09:00 SP → fim do dia 22 = 23/06 00:00 SP = 03:00 UTC
      expect(ate.toISOString()).toBe('2026-06-23T03:00:00.000Z');
    });

    it('create: vencimento date-only "2026-06-30" → meio-dia local (exibe 30/06, não 29)', async () => {
      await service.create({
        tipo: ContaTipo.A_PAGAR,
        descricao: 'aluguel',
        valorCentavos: 100,
        vencimento: '2026-06-30',
      } as unknown as CreateContaDto);
      const arg = repo.create.mock.calls[0][0];
      expect(arg.vencimento.toISOString()).toBe('2026-06-30T15:00:00.000Z'); // meio-dia SP
      expect(fmtData(arg.vencimento, SP)).toBe('30/06');
    });

    it('registrarMovimentacao: data date-only → meio-dia local em vencimento e pagoEm', async () => {
      await service.registrarMovimentacao({
        tipo: 'SAIDA',
        descricao: 'x',
        valorCentavos: 100,
        data: '2026-06-30',
      });
      const arg = repo.create.mock.calls[0][0];
      expect(arg.vencimento.toISOString()).toBe('2026-06-30T15:00:00.000Z');
      expect(arg.pagoEm.toISOString()).toBe('2026-06-30T15:00:00.000Z');
    });
  });
});
