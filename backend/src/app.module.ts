import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { RecadosModule } from './modules/recados/recados.module';
import { TarefasModule } from './modules/tarefas/tarefas.module';
import { LembretesModule } from './modules/lembretes/lembretes.module';
import { AgendaModule } from './modules/agenda/agenda.module';
import { FinanceiroModule } from './modules/financeiro/financeiro.module';
import { CategoriasModule } from './modules/categorias/categorias.module';
import { FinancasModule } from './modules/financas/financas.module';
import { CustoModule } from './modules/custo/custo.module';
import { NinaModule } from './modules/nina/nina.module';
import { ResumoModule } from './modules/resumo/resumo.module';
import { AuthMiddleware } from './common/auth/auth.middleware';
import { TenantThrottlerGuard } from './common/throttler/tenant-throttler.guard';

/**
 * Módulo raiz. O AuthMiddleware resolve o tenant em todas as rotas, exceto as
 * públicas (login) e o health check. Demais módulos GTD/agenda entram aqui.
 *
 * Rate-limit global (SPEC-008): default folgado de 120 req/60s por chave, onde
 * a chave é o tenant (autenticado) ou o IP (anônimo) — ver TenantThrottlerGuard.
 */
@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    RecadosModule,
    TarefasModule,
    LembretesModule,
    AgendaModule,
    FinanceiroModule,
    CategoriasModule,
    FinancasModule,
    CustoModule,
    NinaModule,
    ResumoModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: TenantThrottlerGuard }],
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
