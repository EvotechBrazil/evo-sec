import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ChatMsg, ContextoService } from './contexto.service';
import { RegistrarContextoDto } from './dto/contexto.dto';

/**
 * Memória conversacional durável (SPEC-006). Tenant-scoped (JWT ou
 * x-service-token + x-tenant-id). Consumido pela voz do app (`nina.service`)
 * e, futuramente, pelo cérebro WhatsApp (n8n) no lugar do staticData.
 */
@Controller('nina')
export class ContextoController {
  constructor(private readonly contexto: ContextoService) {}

  @Get('contexto')
  async historico(@Query('limite') limite?: string): Promise<{ mensagens: ChatMsg[] }> {
    const n = Math.min(30, Math.max(1, Number(limite) || 8));
    return { mensagens: await this.contexto.historico(n) };
  }

  @Post('contexto')
  @HttpCode(HttpStatus.NO_CONTENT)
  async registrar(@Body() dto: RegistrarContextoDto): Promise<void> {
    await this.contexto.registrar(dto.role, dto.conteudo);
  }
}
