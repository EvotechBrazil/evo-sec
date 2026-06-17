import { Injectable } from '@nestjs/common';
import { UsoLlm } from '@prisma/client';
import { CustoRepository } from './custo.repository';
import { CreateUsoDto } from './dto/create-uso.dto';

export interface ResumoCusto {
  custoMicroUsd: number;
  tokensIn: number;
  tokensOut: number;
  porModelo: { modelo: string; custoMicroUsd: number }[];
}

@Injectable()
export class CustoService {
  constructor(private readonly repo: CustoRepository) {}

  registrar(dto: CreateUsoDto): Promise<UsoLlm> {
    return this.repo.create(dto);
  }

  listar(): Promise<UsoLlm[]> {
    return this.repo.findRecentes();
  }

  async resumo(dias = 30): Promise<ResumoCusto> {
    const desde = new Date(Date.now() - dias * 86_400_000);
    const [totais, porModelo] = await Promise.all([
      this.repo.resumo(desde),
      this.repo.porModelo(desde),
    ]);
    return { ...totais, porModelo };
  }
}
