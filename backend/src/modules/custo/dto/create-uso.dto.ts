import { ModeloTarefa } from '@prisma/client';
import { IsEnum, IsInt, IsString, Min } from 'class-validator';

export class CreateUsoDto {
  @IsEnum(ModeloTarefa)
  tarefa!: ModeloTarefa;

  @IsString()
  modelo!: string;

  @IsInt()
  @Min(0)
  tokensIn!: number;

  @IsInt()
  @Min(0)
  tokensOut!: number;

  /** Custo em microdólares (inteiro) — evita float. */
  @IsInt()
  @Min(0)
  custoMicroUsd!: number;
}
