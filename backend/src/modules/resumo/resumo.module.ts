import { Module } from '@nestjs/common';
import { ResumoController } from './resumo.controller';
import { ResumoService } from './resumo.service';
import { ResumoRepository } from './resumo.repository';
import { AlertasController } from './alertas/alertas.controller';
import { AlertaVencimentosService } from './alertas/alertas-vencimentos.service';
import { AlertaMetasService } from './alertas/alertas-metas.service';
import { AlertaAguardandoService } from './alertas/alertas-aguardando.service';
import { AlertaLembretesService } from './alertas/alertas-lembretes.service';
import { AlertaCustoService } from './alertas/alerta-custo.service';
import { RecadosModule } from '../recados/recados.module';
import { TarefasModule } from '../tarefas/tarefas.module';
import { LembretesModule } from '../lembretes/lembretes.module';
import { AgendaModule } from '../agenda/agenda.module';
import { FinanceiroModule } from '../financeiro/financeiro.module';
import { FinancasModule } from '../financas/financas.module';
import { CustoModule } from '../custo/custo.module';

/**
 * Agrega os dados do tenant em digests diário/semanal (SPEC-002) e alertas
 * proativos (SPEC-004) reusando os services existentes (sem reescrever lógica
 * — espelho da abordagem do NinaModule).
 */
@Module({
  imports: [
    RecadosModule,
    TarefasModule,
    LembretesModule,
    AgendaModule,
    FinanceiroModule,
    FinancasModule,
    CustoModule,
  ],
  controllers: [ResumoController, AlertasController],
  providers: [
    ResumoService,
    ResumoRepository,
    AlertaVencimentosService,
    AlertaMetasService,
    AlertaAguardandoService,
    AlertaLembretesService,
    AlertaCustoService,
  ],
})
export class ResumoModule {}
