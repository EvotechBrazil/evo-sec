import { InvestimentoTipo, NivelRisco } from '@prisma/client';
import { IsEnum, IsISO8601, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateInvestimentoDto {
  @IsEnum(InvestimentoTipo)
  tipo!: InvestimentoTipo;

  @IsOptional()
  @IsString()
  instituicao?: string;

  @IsInt()
  @Min(1)
  valorAplicadoCent!: number;

  @IsISO8601()
  dataAplicacao!: string;

  @IsOptional()
  @IsString()
  rendimentoEstimado?: string;

  @IsOptional()
  @IsString()
  liquidez?: string;

  @IsOptional()
  @IsEnum(NivelRisco)
  risco?: NivelRisco;
}
