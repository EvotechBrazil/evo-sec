import { Injectable, NotFoundException } from '@nestjs/common';
import { Lembrete } from '@prisma/client';
import { LembretesRepository } from './lembretes.repository';
import { CreateLembreteDto } from './dto/create-lembrete.dto';
import { UpdateLembreteDto } from './dto/update-lembrete.dto';
import { proximaOcorrencia } from '../../common/datas/recorrencia.util';

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

  /**
   * Dispara os lembretes vencidos (SPEC-010): devolve os que disparam AGORA (com a
   * `dataHora` original, p/ exibir a hora) e, em transação, marca os não-recorrentes
   * como `NOTIFICADO` e avança a `dataHora` dos recorrentes p/ a próxima ocorrência.
   * Mutação atômica antes de devolver (at-most-once na v1 — ver SPEC-010 §2).
   */
  async dispararPendentes(now: Date = new Date()): Promise<Lembrete[]> {
    const due = await this.repo.findDue(now);
    if (due.length === 0) return [];

    const terminaisIds: string[] = [];
    const avancos: { id: string; proxima: Date }[] = [];
    for (const l of due) {
      const prox = proximaOcorrencia(l.dataHora, l.recorrencia, now);
      if (prox) avancos.push({ id: l.id, proxima: prox });
      else terminaisIds.push(l.id);
    }

    await this.repo.aplicarDisparo(terminaisIds, avancos);
    return due;
  }
}
