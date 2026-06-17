import { IsInt, Min } from 'class-validator';

export class AportarDto {
  /** Valor do aporte em centavos. */
  @IsInt()
  @Min(1)
  valorCentavos!: number;
}
