import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

export interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta?: unknown;
}

/**
 * Wraps successful responses in a consistent envelope. If a handler returns
 * `{ data, meta }` (list responses), the meta is surfaced at the top level.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiEnvelope<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiEnvelope<T>> {
    return next.handle().pipe(
      map((payload) => {
        if (
          payload &&
          typeof payload === 'object' &&
          'data' in (payload as Record<string, unknown>) &&
          'meta' in (payload as Record<string, unknown>)
        ) {
          const p = payload as unknown as { data: T; meta: unknown };
          return { success: true, data: p.data, meta: p.meta };
        }
        return { success: true, data: payload };
      }),
    );
  }
}
