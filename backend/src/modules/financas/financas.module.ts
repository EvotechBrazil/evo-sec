import { Module } from '@nestjs/common';
import { FinancasController } from './financas.controller';
import { FinancasService } from './financas.service';
import { FinancasRepository } from './financas.repository';

@Module({
  controllers: [FinancasController],
  providers: [FinancasService, FinancasRepository],
})
export class FinancasModule {}
