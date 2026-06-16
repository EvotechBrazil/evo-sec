import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Envelope de resposta padrão: { data, meta } (DEV OS §9.5).
 * Se o controller já retornar { data, meta }, repassa sem duplicar.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, { data: T; meta?: unknown }> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<{ data: T; meta?: unknown }> {
    return next.handle().pipe(
      map((payload) => {
        if (payload && typeof payload === 'object' && 'data' in payload) {
          return payload as unknown as { data: T; meta?: unknown };
        }
        return { data: payload };
      }),
    );
  }
}
