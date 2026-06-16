import { Calendario, CompromissoStatus } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateCompromissoDto {
  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsISO8601()
  inicio?: string;

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

  @IsOptional()
  @IsInt()
  @Min(0)
  lembreteAntecedMin?: number;

  @IsOptional()
  @IsEnum(CompromissoStatus)
  status?: CompromissoStatus;
}
