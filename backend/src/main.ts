import 'reflect-metadata';
import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { loadEnv } from './config/env.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  // Handlers globais de crash (SPEC-012 slice 14B): garantem que erros
  // assíncronos nunca passem despercebidos. Usamos o Logger do Nest (não
  // `console`) para manter o formato/coleta de logs padrão da aplicação.
  process.on('unhandledRejection', (reason) => {
    logger.error('unhandledRejection', reason instanceof Error ? reason.stack : String(reason));
    // TODO Sentry.captureException(reason)
  });
  process.on('uncaughtException', (err) => {
    logger.error('uncaughtException', err.stack);
    // TODO Sentry.captureException(err)
    // Decisão: apenas logamos e NÃO chamamos process.exit. Derrubar o processo
    // a cada exceção não-tratada arriscaria interromper requisições/tarefas em
    // andamento. Preferimos manter o processo vivo e deixar que o orquestrador
    // externo (EasyPanel/Docker) decida reiniciar via healthcheck se necessário.
  });

  const env = loadEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // O webhook do Evolution carrega mídia em base64 (áudio/foto) — o default de
  // 100kb do body parser rejeitaria. Subimos o teto p/ acomodar o repasse.
  app.useBodyParser('json', { limit: '15mb' });

  app.use(helmet());
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix(env.apiPrefix.replace(/^\//, ''));
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen(env.port);
}

void bootstrap();
