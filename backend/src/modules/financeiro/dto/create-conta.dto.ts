import { ContaTipo, Recorrencia } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateContaDto {
  @IsEnum(ContaTipo)
  tipo!: ContaTipo;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  descricao!: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  /** Dinheiro SEMPRE em centavos (inteiro). */
  @IsInt()
  @Min(0)
  valorCentavos!: number;

  @IsISO8601()
  vencimento!: string;

  @IsOptional()
  @IsEnum(Recorrencia)
  recorrencia?: Recorrencia;

  @IsOptional()
  @IsString()
  contraparte?: string;
}
