import { IsISO8601, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateMetaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  nome!: string;

  @IsInt()
  @Min(1)
  valorAlvoCentavos!: number;

  @IsOptional()
  @IsISO8601()
  prazo?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  aporteMensalSugeridoCent?: number;
}
