import { Recorrencia } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateLembreteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  titulo!: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsISO8601()
  dataHora!: string;

  @IsOptional()
  @IsEnum(Recorrencia)
  recorrencia?: Recorrencia;
}
