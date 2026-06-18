import { IsString, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  senhaAtual!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(200)
  novaSenha!: string;
}
