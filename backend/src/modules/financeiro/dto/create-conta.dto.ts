import { ContaOrigem, ContaTipo, Recorrencia } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
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

  /** Texto livre legado; preferir `categoriaId`. */
  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsUUID()
  categoriaId?: string;

  /** Dinheiro SEMPRE em centavos (inteiro). */
  @IsInt()
  @Min(0)
  valorCentavos!: number;

  @IsISO8601()
  vencimento!: string;

  @IsOptional()
  @IsEnum(Recorrencia)
  recorrencia?: Recorrencia;

  /** AVULSO (caixa) ou TITULO (com vencimento). Default no schema: TITULO. */
  @IsOptional()
  @IsEnum(ContaOrigem)
  origem?: ContaOrigem;

  @IsOptional()
  @IsString()
  contraparte?: string;

  /**
   * Chave de idempotência (SPEC-013): reentrega do mesmo evento (ex.: `key.id` do
   * WhatsApp) não duplica a conta — o repositório devolve o registro existente.
   */
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
