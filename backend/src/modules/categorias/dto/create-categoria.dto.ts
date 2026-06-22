import { CategoriaTipo, GrupoDre } from '@prisma/client';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoriaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nome!: string;

  @IsEnum(CategoriaTipo)
  tipo!: CategoriaTipo;

  @IsEnum(GrupoDre)
  grupoDre!: GrupoDre;
}
