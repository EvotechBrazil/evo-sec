import { Prioridade } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRecadoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  conteudo!: string;

  @IsOptional()
  @IsString()
  remetente?: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsEnum(Prioridade)
  prioridade?: Prioridade;
}
