import { Prioridade, TarefaTipo } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTarefaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  titulo!: string;

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
}
