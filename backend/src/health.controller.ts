import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

// Sonda de saúde (liveness/readiness) — anônima e potencialmente de alta
// frequência; nunca deve ser estrangulada pelo rate-limit.
@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: string; service: string } {
    return { status: 'ok', service: 'evo-sec-backend' };
  }
}
