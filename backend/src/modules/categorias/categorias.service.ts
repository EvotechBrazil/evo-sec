import { Injectable, NotFoundException } from '@nestjs/common';
import { Categoria } from '@prisma/client';
import { CategoriasRepository } from './categorias.repository';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { CATEGORIAS_PADRAO } from './categorias.constants';

@Injectable()
export class CategoriasService {
  constructor(private readonly repo: CategoriasRepository) {}

  list(): Promise<Categoria[]> {
    return this.repo.findMany({ ativo: true });
  }

  async get(id: string): Promise<Categoria> {
    const cat = await this.repo.findById(id);
    if (!cat) throw new NotFoundException('Categoria não encontrada.');
    return cat;
  }

  create(dto: CreateCategoriaDto): Promise<Categoria> {
    return this.repo.create({ ...dto, isSystem: false });
  }

  async update(id: string, dto: UpdateCategoriaDto): Promise<Categoria> {
    const result = await this.repo.update(id, dto);
    if (result.count === 0) throw new NotFoundException('Categoria não encontrada.');
    return this.get(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.softDelete(id);
    if (result.count === 0) throw new NotFoundException('Categoria não encontrada.');
  }

  /**
   * Resolve uma categoria pelo nome aproximado (case-insensitive, match por conteúdo).
   * Usado pela Nina ao classificar um lançamento ("mão de obra" → "Mão de obra / serviços terceiros").
   */
  async resolverPorNome(nome?: string): Promise<Categoria | null> {
    if (!nome) return null;
    const todas = await this.repo.findMany({ ativo: true });
    const alvo = nome.toLowerCase().trim();
    return (
      todas.find((c) => c.nome.toLowerCase() === alvo) ??
      todas.find((c) => {
        const n = c.nome.toLowerCase();
        return n.includes(alvo) || alvo.includes(n.split(' ')[0]);
      }) ??
      null
    );
  }

  /** Garante as categorias-base (isSystem) para o tenant atual. Idempotente. */
  async garantirPadrao(): Promise<number> {
    const existentes = await this.repo.findMany();
    const nomes = new Set(existentes.map((c) => c.nome.toLowerCase()));
    let criadas = 0;
    for (const cat of CATEGORIAS_PADRAO) {
      if (!nomes.has(cat.nome.toLowerCase())) {
        await this.repo.create({ ...cat, isSystem: true });
        criadas++;
      }
    }
    return criadas;
  }
}
