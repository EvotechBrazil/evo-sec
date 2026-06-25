import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class AportarDto {
  /** Valor do aporte em centavos. */
  @IsInt()
  @Min(1)
  valorCentavos!: number;

  /**
   * Chave de idempotência (SPEC-013). Quando enviada, um reenvio com a mesma
   * chave não soma o aporte de novo (no-op). Tipicamente o `key.id` da
   * mensagem do WhatsApp na borda (n8n).
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  idempotencyKey?: string;
}
