import { Module } from '@nestjs/common';
import { LembretesController } from './lembretes.controller';
import { LembretesService } from './lembretes.service';
import { LembretesRepository } from './lembretes.repository';

@Module({
  controllers: [LembretesController],
  providers: [LembretesService, LembretesRepository],
})
export class LembretesModule {}
