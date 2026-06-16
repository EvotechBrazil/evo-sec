import { Injectable, NotFoundException } from '@nestjs/common';
import { Lembrete } from '@prisma/client';
import { LembretesRepository } from './lembretes.repository';
import { CreateLembreteDto } from './dto/create-lembrete.dto';
import { UpdateLembreteDto } from './dto/update-lembrete.dto';

@Injectable()
export class LembretesService {
  constructor(private readonly repo: LembretesRepository) {}

  create(dto: CreateLembreteDto): Promise<Lembrete> {
    return this.repo.create(dto);
  }

  list(): Promise<Lembrete[]> {
    return this.repo.findMany();
  }

  async get(id: string): Promise<Lembrete> {
    const lembrete = await this.repo.findById(id);
    if (!lembrete) {
      throw new NotFoundException('Lembrete não encontrado.');
    }
    return lembrete;
  }

  async update(id: string, dto: UpdateLembreteDto): Promise<Lembrete> {
    const result = await this.repo.update(id, dto);
    if (result.count === 0) {
      throw new NotFoundException('Lembrete não encontrado.');
    }
    return this.get(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.softDelete(id);
    if (result.count === 0) {
      throw new NotFoundException('Lembrete não encontrado.');
    }
  }
}
