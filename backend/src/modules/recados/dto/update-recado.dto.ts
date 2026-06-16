import { RecadoStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateRecadoDto {
  @IsOptional()
  @IsString()
  conteudo?: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsEnum(RecadoStatus)
  status?: RecadoStatus;
}
