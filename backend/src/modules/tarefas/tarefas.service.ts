import { Injectable, NotFoundException } from '@nestjs/common';
import { Tarefa, TarefaTipo } from '@prisma/client';
import { TarefasRepository } from './tarefas.repository';
import { CreateTarefaDto } from './dto/create-tarefa.dto';
import { UpdateTarefaDto } from './dto/update-tarefa.dto';

@Injectable()
export class TarefasService {
  constructor(private readonly repo: TarefasRepository) {}

  create(dto: CreateTarefaDto): Promise<Tarefa> {
    return this.repo.create(dto);
  }

  list(tipo?: TarefaTipo): Promise<Tarefa[]> {
    return this.repo.findMany(tipo ? { tipo } : {});
  }

  async get(id: string): Promise<Tarefa> {
    const tarefa = await this.repo.findById(id);
    if (!tarefa) {
      throw new NotFoundException('Tarefa não encontrada.');
    }
    return tarefa;
  }

  async update(id: string, dto: UpdateTarefaDto): Promise<Tarefa> {
    const result = await this.repo.update(id, dto);
    if (result.count === 0) {
      throw new NotFoundException('Tarefa não encontrada.');
    }
    return this.get(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.softDelete(id);
    if (result.count === 0) {
      throw new NotFoundException('Tarefa não encontrada.');
    }
  }
}
