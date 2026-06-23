import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { NinaService, NinaReply } from './nina.service';
import { VozResultado } from './elevenlabs.adapter';
import { MensagemDto } from './dto/mensagem.dto';
import { VozDto } from './dto/voz.dto';

@Controller('nina')
export class NinaController {
  constructor(private readonly nina: NinaService) {}

  @Post('mensagem')
  @HttpCode(HttpStatus.OK)
  mensagem(@Body() dto: MensagemDto): Promise<NinaReply> {
    return this.nina.processar(dto.texto, dto.pendente);
  }

  /** TTS da resposta com a MESMA voz do WhatsApp (ElevenLabs) — usado pela voz do app (`/falar`). */
  @Post('voz')
  @HttpCode(HttpStatus.OK)
  voz(@Body() dto: VozDto): Promise<VozResultado> {
    return this.nina.gerarVoz(dto.texto);
  }
}
