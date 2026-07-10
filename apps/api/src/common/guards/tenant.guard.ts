import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole, type JwtPayload } from '@utanstore/shared';

/**
 * Defense-in-depth: ensures a tenant is bound before hitting tenant-scoped
 * admin controllers. Super-admins are exempt (they operate cross-tenant).
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user as JwtPayload | undefined;

    if (user?.role === UserRole.SUPER_ADMIN) return true;

    const tenantId = req.tenantId ?? user?.tenantId ?? null;
    if (!tenantId) {
      throw new ForbiddenException('No tenant context resolved for this request');
    }
    return true;
  }
}
