import { Injectable, NotFoundException } from '@nestjs/common';
import { Investimento, MetaFinanceira } from '@prisma/client';
import { FinancasRepository } from './financas.repository';
import { CreateMetaDto } from './dto/create-meta.dto';
import { CreateInvestimentoDto } from './dto/create-investimento.dto';

const DISCLAIMER =
  'Conteúdo educativo, não é recomendação financeira regulada. A decisão é sua. Foco em baixo risco (Tesouro Selic, CDB de liquidez diária, fundo DI).';

export interface MetaEvolucao extends MetaFinanceira {
  progressoPct: number;
  atrasada: boolean;
}

export interface Evolucao {
  metas: MetaEvolucao[];
  totalInvestidoCentavos: number;
  disclaimer: string;
}

@Injectable()
export class FinancasService {
  constructor(private readonly repo: FinancasRepository) {}

  createMeta(dto: CreateMetaDto): Promise<MetaFinanceira> {
    return this.repo.createMeta(dto);
  }

  listMetas(): Promise<MetaFinanceira[]> {
    return this.repo.listMetas();
  }

  async aportar(
    id: string,
    valorCentavos: number,
    idempotencyKey?: string,
  ): Promise<MetaFinanceira> {
    const result = await this.repo.aportar(id, valorCentavos, idempotencyKey);
    // Reenvio da mesma chave (SPEC-013): não incrementou de novo, mas a meta
    // existe — devolve o estado atual sem 404.
    if (result.count === 0 && !result.jaAplicado) {
      throw new NotFoundException('Meta não encontrada.');
    }
    const meta = await this.repo.findMeta(id);
    if (!meta) throw new NotFoundException('Meta não encontrada.');
    return meta;
  }

  createInvestimento(dto: CreateInvestimentoDto): Promise<Investimento> {
    return this.repo.createInvestimento(dto);
  }

  listInvestimentos(): Promise<Investimento[]> {
    return this.repo.listInvestimentos();
  }

  async evolucao(): Promise<Evolucao> {
    const [metas, totalInvestidoCentavos] = await Promise.all([
      this.repo.listMetas(),
      this.repo.totalInvestidoCentavos(),
    ]);
    return {
      metas: metas.map((m) => this.comProgresso(m)),
      totalInvestidoCentavos,
      disclaimer: DISCLAIMER,
    };
  }

  private comProgresso(meta: MetaFinanceira): MetaEvolucao {
    const progressoPct =
      meta.valorAlvoCentavos > 0
        ? Math.min(100, Math.round((meta.valorAtualCentavos / meta.valorAlvoCentavos) * 100))
        : 0;
    let atrasada = false;
    if (meta.alertaAtraso && meta.prazo && progressoPct < 100) {
      const inicio = meta.createdAt.getTime();
      const fim = meta.prazo.getTime();
      const agora = Date.now();
      if (fim > inicio) {
        const esperadoPct = Math.min(100, ((agora - inicio) / (fim - inicio)) * 100);
        atrasada = progressoPct < esperadoPct - 5; // 5pp de tolerância
      }
    }
    return { ...meta, progressoPct, atrasada };
  }
}
