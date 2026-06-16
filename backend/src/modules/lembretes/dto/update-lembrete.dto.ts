import { LembreteStatus, Recorrencia } from '@prisma/client';
import { IsBoolean, IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';

export class UpdateLembreteDto {
  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsISO8601()
  dataHora?: string;

  @IsOptional()
  @IsEnum(Recorrencia)
  recorrencia?: Recorrencia;

  @IsOptional()
  @IsBoolean()
  notificado?: boolean;

  @IsOptional()
  @IsEnum(LembreteStatus)
  status?: LembreteStatus;
}
