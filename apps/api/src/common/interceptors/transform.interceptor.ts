import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

export interface ApiEnvelope<T> {
  success: true;
  data: T;
}

/**
 * Wraps every successful response in a consistent envelope: `{ success, data }`.
 *
 * The handler's return value is placed verbatim in `data`. For paginated
 * endpoints that return `{ data, meta }`, the client receives
 * `{ success: true, data: { data: [...], meta } }` — so `response.data` is the
 * list payload and `response.data.data` is the array, matching the frontend's
 * ApiListResponse shape. (We intentionally do NOT hoist `meta`, which
 * previously made `response.data` the bare array and broke list pages.)
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiEnvelope<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiEnvelope<T>> {
    return next.handle().pipe(map((payload) => ({ success: true as const, data: payload })));
  }
}
