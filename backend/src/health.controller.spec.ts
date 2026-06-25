import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from './prisma/prisma.service';

/**
 * Testes de unidade do HealthController (SPEC-012, slice 14A) com PrismaService
 * mockado (sem DB). Foco: liveness estático sempre 200; readiness pinga o banco
 * e devolve 503 quando o ping falha. Construção direta do controller (padrão do
 * projeto — sem TestingModule do Nest).
 */
describe('HealthController', () => {
  function build(ping: jest.Mock = jest.fn().mockResolvedValue(undefined)) {
    const prisma = { ping };
    const controller = new HealthController(prisma as unknown as PrismaService);
    return { controller, prisma };
  }

  describe('check (liveness)', () => {
    it('retorna status ok e o nome do serviço, sem tocar no banco', () => {
      const { controller, prisma } = build();
      expect(controller.check()).toEqual({
        status: 'ok',
        service: 'evo-sec-backend',
      });
      // Liveness é estático: não consulta o Postgres.
      expect(prisma.ping).not.toHaveBeenCalled();
    });
  });

  describe('ready (readiness)', () => {
    it('retorna {status:"ready"} quando o ping resolve', async () => {
      const ping = jest.fn().mockResolvedValue(undefined);
      const { controller } = build(ping);
      await expect(controller.ready()).resolves.toEqual({ status: 'ready' });
      expect(ping).toHaveBeenCalledTimes(1);
    });

    it('lança ServiceUnavailableException (503) quando o ping rejeita', async () => {
      const ping = jest.fn().mockRejectedValue(new Error('connection refused'));
      const { controller } = build(ping);
      await expect(controller.ready()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(ping).toHaveBeenCalledTimes(1);
    });

    it('mensagem do 503 é "Banco indisponível."', async () => {
      const ping = jest.fn().mockRejectedValue(new Error('down'));
      const { controller } = build(ping);
      await expect(controller.ready()).rejects.toMatchObject({
        message: 'Banco indisponível.',
      });
    });
  });
});
