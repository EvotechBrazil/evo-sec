import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';

/**
 * Módulo raiz. Os módulos de feature (auth, tenant, recados, tarefas, lembretes,
 * agenda) entram aqui conforme construídos na Sprint 1+.
 */
@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
})
export class AppModule {}
