import { Injectable, NotFoundException } from '@nestjs/common';
import { Recado } from '@prisma/client';
import { RecadosRepository } from './recados.repository';
import { CreateRecadoDto } from './dto/create-recado.dto';
import { UpdateRecadoDto } from './dto/update-recado.dto';

@Injectable()
export class RecadosService {
  constructor(private readonly repo: RecadosRepository) {}

  create(dto: CreateRecadoDto): Promise<Recado> {
    return this.repo.create(dto);
  }

  list(): Promise<Recado[]> {
    return this.repo.findMany();
  }

  async get(id: string): Promise<Recado> {
    const recado = await this.repo.findById(id);
    if (!recado) {
      throw new NotFoundException('Recado não encontrado.');
    }
    return recado;
  }

  async update(id: string, dto: UpdateRecadoDto): Promise<Recado> {
    const result = await this.repo.update(id, dto);
    if (result.count === 0) {
      throw new NotFoundException('Recado não encontrado.');
    }
    return this.get(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.softDelete(id);
    if (result.count === 0) {
      throw new NotFoundException('Recado não encontrado.');
    }
  }
}
