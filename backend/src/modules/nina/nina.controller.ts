import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { NinaService, NinaReply } from './nina.service';
import { MensagemDto } from './dto/mensagem.dto';

@Controller('nina')
export class NinaController {
  constructor(private readonly nina: NinaService) {}

  @Post('mensagem')
  @HttpCode(HttpStatus.OK)
  mensagem(@Body() dto: MensagemDto): Promise<NinaReply> {
    return this.nina.processar(dto.texto, dto.pendente);
  }
}
