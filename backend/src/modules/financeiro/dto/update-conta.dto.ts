import { ContaStatus } from '@prisma/client';
import { IsEnum, IsISO8601, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class UpdateContaDto {
  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsUUID()
  categoriaId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  valorCentavos?: number;

  @IsOptional()
  @IsISO8601()
  vencimento?: string;

  @IsOptional()
  @IsEnum(ContaStatus)
  status?: ContaStatus;
}
