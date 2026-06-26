import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { WebhookService } from './webhook.service';

/**
 * Ponte pública Evolution → n8n. Fica FORA do JWT (registrada no `.exclude()` do
 * AuthMiddleware em `app.module`) e FORA do rate-limit por tenant
 * (`@SkipThrottle` — não há tenant aqui; o keying cairia no IP único do
 * Evolution). Autenticação por `?token=` é feita no service.
 */
@SkipThrottle()
@Controller('webhook')
export class WebhookController {
  constructor(private readonly service: WebhookService) {}

  // POST /api/v1/webhook/nina?token=...  (URL configurada no Evolution)
  @Post('nina')
  @HttpCode(HttpStatus.OK)
  receberNina(
    @Body() payload: unknown,
    @Query('token') token?: string,
  ): Promise<{ status: string }> {
    return this.service.repassarNina(payload, token);
  }
}
