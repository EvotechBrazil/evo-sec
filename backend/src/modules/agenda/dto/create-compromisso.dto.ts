import { Calendario } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCompromissoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  titulo!: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsISO8601()
  inicio!: string;

  @IsOptional()
  @IsISO8601()
  fim?: string;

  @IsOptional()
  @IsBoolean()
  diaInteiro?: boolean;

  @IsOptional()
  @IsString()
  local?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participantes?: string[];

  @IsOptional()
  @IsEnum(Calendario)
  calendario?: Calendario;

  /** Palavra-chave de recorrência (diario|semanal|mensal|anual) — expansão na leitura (ADR-005). */
  @IsOptional()
  @IsString()
  regraRecorrencia?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  lembreteAntecedMin?: number;
}
