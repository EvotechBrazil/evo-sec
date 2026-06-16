import { Injectable, NotFoundException } from '@nestjs/common';
import { Compromisso, CompromissoStatus } from '@prisma/client';
import { AgendaRepository } from './agenda.repository';
import { CreateCompromissoDto } from './dto/create-compromisso.dto';
import { UpdateCompromissoDto } from './dto/update-compromisso.dto';

const DURACAO_PADRAO_MIN = 60;

export interface Disponibilidade {
  disponivel: boolean;
  conflitos: Compromisso[];
}

@Injectable()
export class AgendaService {
  constructor(private readonly repo: AgendaRepository) {}

  create(dto: CreateCompromissoDto): Promise<Compromisso> {
    return this.repo.create({
      titulo: dto.titulo,
      descricao: dto.descricao,
      inicio: dto.inicio,
      fim: dto.fim,
      diaInteiro: dto.diaInteiro,
      local: dto.local,
      participantes: dto.participantes ?? [],
      calendario: dto.calendario,
      regraRecorrencia: dto.regraRecorrencia,
      lembreteAntecedMin: dto.lembreteAntecedMin,
    });
  }

  /** Verifica conflitos de agenda. Se `fim` não vier, assume duração padrão. */
  async checarDisponibilidade(inicioIso: string, fimIso?: string): Promise<Disponibilidade> {
    const inicio = new Date(inicioIso);
    const fim = fimIso
      ? new Date(fimIso)
      : new Date(inicio.getTime() + DURACAO_PADRAO_MIN * 60_000);
    const conflitos = await this.repo.findOverlapping(inicio, fim);
    return { disponivel: conflitos.length === 0, conflitos };
  }

  list(inicioIso?: string, fimIso?: string): Promise<Compromisso[]> {
    if (inicioIso && fimIso) {
      return this.repo.findOverlapping(new Date(inicioIso), new Date(fimIso));
    }
    return this.repo.findUpcoming(new Date());
  }

  async get(id: string): Promise<Compromisso> {
    const compromisso = await this.repo.findById(id);
    if (!compromisso) {
      throw new NotFoundException('Compromisso não encontrado.');
    }
    return compromisso;
  }

  async update(id: string, dto: UpdateCompromissoDto): Promise<Compromisso> {
    const result = await this.repo.update(id, dto);
    if (result.count === 0) {
      throw new NotFoundException('Compromisso não encontrado.');
    }
    return this.get(id);
  }

  /** Cancelamento (ação destrutiva) — marca status CANCELADO. */
  async cancelar(id: string): Promise<Compromisso> {
    const result = await this.repo.update(id, { status: CompromissoStatus.CANCELADO });
    if (result.count === 0) {
      throw new NotFoundException('Compromisso não encontrado.');
    }
    return this.get(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.softDelete(id);
    if (result.count === 0) {
      throw new NotFoundException('Compromisso não encontrado.');
    }
  }
}
