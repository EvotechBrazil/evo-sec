import { Module } from '@nestjs/common';
import { NinaController } from './nina.controller';
import { NinaService } from './nina.service';
import { OpenRouterAdapter } from './openrouter.adapter';
import { ElevenLabsAdapter } from './elevenlabs.adapter';
import { RecadosModule } from '../recados/recados.module';
import { TarefasModule } from '../tarefas/tarefas.module';
import { LembretesModule } from '../lembretes/lembretes.module';
import { AgendaModule } from '../agenda/agenda.module';
import { FinanceiroModule } from '../financeiro/financeiro.module';
import { CategoriasModule } from '../categorias/categorias.module';
import { FinancasModule } from '../financas/financas.module';

@Module({
  imports: [RecadosModule, TarefasModule, LembretesModule, AgendaModule, FinanceiroModule, CategoriasModule, FinancasModule],
  controllers: [NinaController],
  providers: [NinaService, OpenRouterAdapter, ElevenLabsAdapter],
})
export class NinaModule {}
