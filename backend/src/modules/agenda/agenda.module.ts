import { Module } from '@nestjs/common';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';
import { AgendaRepository } from './agenda.repository';

@Module({
  controllers: [AgendaController],
  providers: [AgendaService, AgendaRepository],
})
export class AgendaModule {}
