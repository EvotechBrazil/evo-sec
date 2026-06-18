import { Module } from '@nestjs/common';
import { RecadosController } from './recados.controller';
import { RecadosService } from './recados.service';
import { RecadosRepository } from './recados.repository';

@Module({
  controllers: [RecadosController],
  providers: [RecadosService, RecadosRepository],
  exports: [RecadosService],
})
export class RecadosModule {}
