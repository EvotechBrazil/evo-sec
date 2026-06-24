import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

/** Body de POST /nina/contexto — grava uma mensagem na sessão ativa. */
export class RegistrarContextoDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  conteudo!: string;
}
