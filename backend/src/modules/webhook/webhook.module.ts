import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

/**
 * Ponte de webhook Evolution → n8n (ver `webhook.service.ts`). Sem dependências
 * de repositório/Prisma — só repassa HTTP.
 */
@Module({
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
