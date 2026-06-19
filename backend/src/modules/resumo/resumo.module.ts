import { Module } from '@nestjs/common';
import { ResumoController } from './resumo.controller';
import { ResumoService } from './resumo.service';
import { ResumoRepository } from './resumo.repository';
import { RecadosModule } from '../recados/recados.module';
import { TarefasModule } from '../tarefas/tarefas.module';
import { LembretesModule } from '../lembretes/lembretes.module';
import { AgendaModule } from '../agenda/agenda.module';
import { FinanceiroModule } from '../financeiro/financeiro.module';

/**
 * Agrega os dados do tenant em digests diário/semanal reusando os services
 * existentes (sem reescrever lógica — espelho da abordagem do NinaModule).
 */
@Module({
  imports: [RecadosModule, TarefasModule, LembretesModule, AgendaModule, FinanceiroModule],
  controllers: [ResumoController],
  providers: [ResumoService, ResumoRepository],
})
export class ResumoModule {}
