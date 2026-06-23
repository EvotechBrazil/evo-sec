import { CategoriaTipo, GrupoDre } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCategoriaDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nome?: string;

  @IsOptional()
  @IsEnum(CategoriaTipo)
  tipo?: CategoriaTipo;

  @IsOptional()
  @IsEnum(GrupoDre)
  grupoDre?: GrupoDre;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
