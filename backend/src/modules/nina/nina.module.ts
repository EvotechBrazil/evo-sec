import { Module } from '@nestjs/common';
import { NinaController } from './nina.controller';
import { NinaService } from './nina.service';
import { OpenRouterAdapter } from './openrouter.adapter';
import { ElevenLabsAdapter } from './elevenlabs.adapter';
import { ContextoController } from './contexto.controller';
import { ContextoService } from './contexto.service';
import { ContextoRepository } from './contexto.repository';
import { RecadosModule } from '../recados/recados.module';
import { TarefasModule } from '../tarefas/tarefas.module';
import { LembretesModule } from '../lembretes/lembretes.module';
import { AgendaModule } from '../agenda/agenda.module';
import { FinanceiroModule } from '../financeiro/financeiro.module';
import { CategoriasModule } from '../categorias/categorias.module';
import { FinancasModule } from '../financas/financas.module';
import { CustoModule } from '../custo/custo.module';

@Module({
  imports: [RecadosModule, TarefasModule, LembretesModule, AgendaModule, FinanceiroModule, CategoriasModule, FinancasModule, CustoModule],
  controllers: [NinaController, ContextoController],
  providers: [NinaService, OpenRouterAdapter, ElevenLabsAdapter, ContextoService, ContextoRepository],
})
export class NinaModule {}
