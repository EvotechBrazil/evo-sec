import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CategoriaTipo,
  Conta,
  ContaOrigem,
  ContaStatus,
  ContaTipo,
  GrupoDre,
} from '@prisma/client';
import { FinanceiroRepository } from './financeiro.repository';
import { CreateContaDto } from './dto/create-conta.dto';
import { UpdateContaDto } from './dto/update-conta.dto';
import { RegistrarMovimentacaoDto } from './dto/registrar-movimentacao.dto';

export interface FluxoCaixa {
  entradasCentavos: number;
  saidasCentavos: number;
  saldoCentavos: number;
}

export interface LinhaResumo {
  chave: string;
  tipo: CategoriaTipo;
  totalCentavos: number;
}

export interface ResumoFinanceiro {
  periodo: { inicio: string; fim: string };
  entradasCentavos: number;
  saidasCentavos: number;
  saldoCentavos: number;
  aPagarPendenteCentavos: number;
  aReceberPendenteCentavos: number;
  porGrupoDre: LinhaResumo[];
  porCategoria: LinhaResumo[];
}

@Injectable()
export class FinanceiroService {
  constructor(private readonly repo: FinanceiroRepository) {}

  create(dto: CreateContaDto): Promise<Conta> {
    return this.repo.create(dto);
  }

  /**
   * Movimentação avulsa de caixa (ADR-007): entrada/saída que já aconteceu.
   * Nasce quitada (origem AVULSO, status RECEBIDO/PAGO, pagoEm=data) e entra no saldo na hora —
   * sem virar um segundo registro, evitando saldo contado em dobro.
   */
  registrarMovimentacao(dto: RegistrarMovimentacaoDto): Promise<Conta> {
    const isEntrada = dto.tipo === 'ENTRADA';
    const tipo = isEntrada ? ContaTipo.A_RECEBER : ContaTipo.A_PAGAR;
    const status = isEntrada ? ContaStatus.RECEBIDO : ContaStatus.PAGO;
    const data = dto.data ? new Date(dto.data) : new Date();
    return this.repo.create({
      tipo,
      descricao: dto.descricao,
      valorCentavos: dto.valorCentavos,
      vencimento: data,
      pagoEm: data,
      status,
      origem: ContaOrigem.AVULSO,
      categoriaId: dto.categoriaId ?? null,
    });
  }

  list(tipo?: ContaTipo, status?: ContaStatus): Promise<Conta[]> {
    return this.repo.findMany({ ...(tipo ? { tipo } : {}), ...(status ? { status } : {}) });
  }

  pendentes(tipo?: ContaTipo): Promise<Conta[]> {
    return this.repo.pendentes(tipo);
  }

  async get(id: string): Promise<Conta> {
    const conta = await this.repo.findById(id);
    if (!conta) throw new NotFoundException('Conta não encontrada.');
    return conta;
  }

  async update(id: string, dto: UpdateContaDto): Promise<Conta> {
    const result = await this.repo.update(id, dto);
    if (result.count === 0) throw new NotFoundException('Conta não encontrada.');
    return this.get(id);
  }

  /** Marca como quitada (pago/recebido conforme o tipo). Ação sensível (confirmar no agente). */
  async marcarQuitada(id: string): Promise<Conta> {
    const conta = await this.get(id);
    const status = conta.tipo === ContaTipo.A_RECEBER ? ContaStatus.RECEBIDO : ContaStatus.PAGO;
    await this.repo.update(id, { status, pagoEm: new Date() });
    return this.get(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.softDelete(id);
    if (result.count === 0) throw new NotFoundException('Conta não encontrada.');
  }

  async fluxoCaixa(inicioIso?: string, fimIso?: string): Promise<FluxoCaixa> {
    const fim = fimIso ? new Date(fimIso) : new Date();
    const inicio = inicioIso ? new Date(inicioIso) : new Date(fim.getFullYear(), fim.getMonth(), 1);
    const [entradas, saidas] = await Promise.all([
      this.repo.somaQuitadas(ContaTipo.A_RECEBER, inicio, fim),
      this.repo.somaQuitadas(ContaTipo.A_PAGAR, inicio, fim),
    ]);
    return {
      entradasCentavos: entradas,
      saidasCentavos: saidas,
      saldoCentavos: entradas - saidas,
    };
  }

  /**
   * Resumo do período (default: mês corrente): saldo + DRE por grupo + breakdown por categoria,
   * tudo em centavos. Regime de caixa (conta na data do pagamento). Base do painel e das respostas da Nina.
   */
  async resumo(inicioIso?: string, fimIso?: string): Promise<ResumoFinanceiro> {
    const fim = fimIso ? new Date(fimIso) : new Date();
    const inicio = inicioIso ? new Date(inicioIso) : new Date(fim.getFullYear(), fim.getMonth(), 1);

    const [quitadas, aPagar, aReceber] = await Promise.all([
      this.repo.quitadasNoPeriodo(inicio, fim),
      this.repo.somaPendentes(ContaTipo.A_PAGAR),
      this.repo.somaPendentes(ContaTipo.A_RECEBER),
    ]);

    let entradas = 0;
    let saidas = 0;
    const porGrupo = new Map<string, LinhaResumo>();
    const porCategoria = new Map<string, LinhaResumo>();

    for (const c of quitadas) {
      const isEntrada = c.tipo === ContaTipo.A_RECEBER;
      if (isEntrada) entradas += c.valorCentavos;
      else saidas += c.valorCentavos;

      const tipoCat = isEntrada ? CategoriaTipo.RECEITA : CategoriaTipo.DESPESA;
      const grupo = c.categoriaRef?.grupoDre ?? (isEntrada ? GrupoDre.VENDA : GrupoDre.EXTRAORDINARIA);
      const nomeCat = c.categoriaRef?.nome ?? c.categoria ?? 'Sem categoria';

      const gKey = `${tipoCat}:${grupo}`;
      const g = porGrupo.get(gKey) ?? { chave: grupo, tipo: tipoCat, totalCentavos: 0 };
      g.totalCentavos += c.valorCentavos;
      porGrupo.set(gKey, g);

      const cKey = nomeCat.toLowerCase();
      const cat = porCategoria.get(cKey) ?? { chave: nomeCat, tipo: tipoCat, totalCentavos: 0 };
      cat.totalCentavos += c.valorCentavos;
      porCategoria.set(cKey, cat);
    }

    const ordenar = (a: LinhaResumo, b: LinhaResumo): number => b.totalCentavos - a.totalCentavos;

    return {
      periodo: { inicio: inicio.toISOString(), fim: fim.toISOString() },
      entradasCentavos: entradas,
      saidasCentavos: saidas,
      saldoCentavos: entradas - saidas,
      aPagarPendenteCentavos: aPagar,
      aReceberPendenteCentavos: aReceber,
      porGrupoDre: [...porGrupo.values()].sort(ordenar),
      porCategoria: [...porCategoria.values()].sort(ordenar),
    };
  }

  vencimentos(dias = 7): Promise<Conta[]> {
    const ate = new Date(Date.now() + dias * 86_400_000);
    return this.repo.vencimentos(ate);
  }
}
