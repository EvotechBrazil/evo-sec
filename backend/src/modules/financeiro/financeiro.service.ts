import { Injectable, NotFoundException } from '@nestjs/common';
import { Conta, ContaStatus, ContaTipo } from '@prisma/client';
import { FinanceiroRepository } from './financeiro.repository';
import { CreateContaDto } from './dto/create-conta.dto';
import { UpdateContaDto } from './dto/update-conta.dto';

export interface FluxoCaixa {
  entradasCentavos: number;
  saidasCentavos: number;
  saldoCentavos: number;
}

@Injectable()
export class FinanceiroService {
  constructor(private readonly repo: FinanceiroRepository) {}

  create(dto: CreateContaDto): Promise<Conta> {
    return this.repo.create(dto);
  }

  list(tipo?: ContaTipo, status?: ContaStatus): Promise<Conta[]> {
    return this.repo.findMany({ ...(tipo ? { tipo } : {}), ...(status ? { status } : {}) });
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

  vencimentos(dias = 7): Promise<Conta[]> {
    const ate = new Date(Date.now() + dias * 86_400_000);
    return this.repo.vencimentos(ate);
  }
}
