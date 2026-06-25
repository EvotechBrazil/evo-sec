import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TenantsRepository } from './tenants.repository';

/**
 * Módulo de LOOKUP de tenants (SPEC-016 · slice 16A): resolve o tenant pelo
 * número do WhatsApp e lista tenants ativos p/ o n8n parar de hardcodar tenant.
 * NÃO tenant-scoped (exceção consciente à RLS — ver TenantsRepository).
 * O PrismaService vem do PrismaModule global.
 */
@Module({
  controllers: [TenantsController],
  providers: [TenantsService, TenantsRepository],
})
export class TenantsModule {}
