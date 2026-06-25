import { IsIn, IsISO8601, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

/** Entrada ou saída de caixa avulsa (já realizada). ADR-007: nasce quitada. */
export class RegistrarMovimentacaoDto {
  @IsIn(['ENTRADA', 'SAIDA'])
  tipo!: 'ENTRADA' | 'SAIDA';

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  descricao!: string;

  /** Dinheiro SEMPRE em centavos (inteiro). */
  @IsInt()
  @Min(1)
  valorCentavos!: number;

  @IsOptional()
  @IsUUID()
  categoriaId?: string;

  /** Data do caixa (default: agora). */
  @IsOptional()
  @IsISO8601()
  data?: string;

  /**
   * Chave de idempotência (SPEC-013): reentrega do mesmo evento (ex.: `key.id` do
   * WhatsApp) não duplica a movimentação — o repositório devolve o registro existente.
   */
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
