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

  async list(inicioIso?: string, fimIso?: string): Promise<Compromisso[]> {
    if (!inicioIso || !fimIso) {
      return this.repo.findUpcoming(new Date());
    }
    const ini = new Date(inicioIso);
    const fim = new Date(fimIso);
    const [overlapping, recorrentes] = await Promise.all([
      this.repo.findOverlapping(ini, fim),
      this.repo.findRecorrentes(),
    ]);
    const naoRecorrentes = overlapping.filter((c) => !c.regraRecorrencia);
    const ocorrencias = recorrentes.flatMap((c) => this.expandir(c, ini, fim));
    return [...naoRecorrentes, ...ocorrencias].sort(
      (a, b) => a.inicio.getTime() - b.inicio.getTime(),
    );
  }

  /** Expande uma base recorrente em ocorrências dentro de [ini, fim] (ADR-005). */
  private expandir(base: Compromisso, ini: Date, fim: Date): Compromisso[] {
    const regra = (base.regraRecorrencia ?? '').toLowerCase();
    const duracaoMs = base.fim ? base.fim.getTime() - base.inicio.getTime() : 0;
    const ocorrencias: Compromisso[] = [];
    const cursor = new Date(base.inicio);
    for (let i = 0; i < 750 && cursor <= fim; i++) {
      if (cursor >= ini) {
        const inicio = new Date(cursor);
        ocorrencias.push({
          ...base,
          inicio,
          fim: duracaoMs ? new Date(inicio.getTime() + duracaoMs) : base.fim,
        });
      }
      if (regra === 'diario') cursor.setDate(cursor.getDate() + 1);
      else if (regra === 'semanal') cursor.setDate(cursor.getDate() + 7);
      else if (regra === 'mensal') cursor.setMonth(cursor.getMonth() + 1);
      else if (regra === 'anual') cursor.setFullYear(cursor.getFullYear() + 1);
      else break; // regra desconhecida → só a base
    }
    return ocorrencias;
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
