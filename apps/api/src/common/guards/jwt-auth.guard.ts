import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { UserRole, type JwtPayload } from '@utanstore/shared';
import { IS_PUBLIC_KEY } from '../decorators';
import { getRequestContext } from '../context/request-context';
import type { Env } from '../../config/env.validation';

/**
 * Authenticates admin/staff/super-admin requests via JWT (httpOnly cookie or
 * Bearer). On success it binds the tenant into the request context:
 *   • SUPER_ADMIN  → RLS bypass (cross-tenant access)
 *   • others       → ctx.tenantId = token.tenantId
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Missing authentication token');

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (payload.type !== 'access') throw new UnauthorizedException('Wrong token type');

    (req as Request & { user?: JwtPayload }).user = payload;

    // Bind tenant context for downstream Prisma/RLS.
    const ctx = getRequestContext();
    if (ctx) {
      ctx.userId = payload.sub;
      if (payload.role === UserRole.SUPER_ADMIN) {
        ctx.bypassRls = true;
      } else if (payload.tenantId) {
        ctx.tenantId = payload.tenantId;
        (req as Request & { tenantId?: string | null }).tenantId = payload.tenantId;
      }
    }

    return true;
  }

  private extractToken(req: Request): string | null {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice(7);
    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
    return cookies?.['access_token'] ?? null;
  }
}
