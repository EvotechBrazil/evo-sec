import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PendingAction } from '../nina.service';

export class MensagemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  texto!: string;

  @IsOptional()
  @IsObject()
  pendente?: PendingAction;
}
