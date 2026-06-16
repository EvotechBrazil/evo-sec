import { Prioridade, TarefaStatus, TarefaTipo } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';

export class UpdateTarefaDto {
  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsEnum(TarefaTipo)
  tipo?: TarefaTipo;

  @IsOptional()
  @IsString()
  aguardandoDe?: string;

  @IsOptional()
  @IsISO8601()
  dataCobranca?: string;

  @IsOptional()
  @IsISO8601()
  prazo?: string;

  @IsOptional()
  @IsEnum(Prioridade)
  prioridade?: Prioridade;

  @IsOptional()
  @IsEnum(TarefaStatus)
  status?: TarefaStatus;
}
