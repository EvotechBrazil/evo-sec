import { Module } from '@nestjs/common';
import { CustoController } from './custo.controller';
import { CustoService } from './custo.service';
import { CustoRepository } from './custo.repository';

@Module({
  controllers: [CustoController],
  providers: [CustoService, CustoRepository],
  exports: [CustoService],
})
export class CustoModule {}
