import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { RecadosModule } from './modules/recados/recados.module';
import { TarefasModule } from './modules/tarefas/tarefas.module';
import { LembretesModule } from './modules/lembretes/lembretes.module';
import { AgendaModule } from './modules/agenda/agenda.module';
import { AuthMiddleware } from './common/auth/auth.middleware';

/**
 * Módulo raiz. O AuthMiddleware resolve o tenant em todas as rotas, exceto as
 * públicas (login) e o health check. Demais módulos GTD/agenda entram aqui.
 */
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    RecadosModule,
    TarefasModule,
    LembretesModule,
    AgendaModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'health', method: RequestMethod.GET },
      )
      .forRoutes('*');
  }
}
