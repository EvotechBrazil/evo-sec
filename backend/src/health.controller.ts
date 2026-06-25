import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from './prisma/prisma.service';

// Sonda de saúde (liveness/readiness) — anônima e potencialmente de alta
// frequência; nunca deve ser estrangulada pelo rate-limit.
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // Liveness: estático e barato — só confirma que o processo responde.
  @Get()
  check(): { status: string; service: string } {
    return { status: 'ok', service: 'evo-sec-backend' };
  }

  // Readiness: pinga o banco. Se o ping falhar, devolve 503 para que o
  // orquestrador pare de rotear tráfego enquanto a dependência está fora.
  @Get('ready')
  async ready(): Promise<{ status: string }> {
    try {
      await this.prisma.ping();
      return { status: 'ready' };
    } catch {
      throw new ServiceUnavailableException('Banco indisponível.');
    }
  }
}
