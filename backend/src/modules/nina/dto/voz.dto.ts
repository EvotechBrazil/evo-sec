import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VozDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  texto!: string;
}
