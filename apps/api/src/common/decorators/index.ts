import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { JwtPayload, UserRole } from '@utanstore/shared';

export const IS_PUBLIC_KEY = 'isPublic';
/** Marks a route as public (skips JwtAuthGuard). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
/** Restricts a route to the given roles (enforced by RolesGuard). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const IS_CUSTOMER_KEY = 'isCustomer';
/** Marks a route as belonging to the storefront customer realm. */
export const CustomerRoute = () => SetMetadata(IS_CUSTOMER_KEY, true);

/** Injects the authenticated admin/staff user (JwtPayload). */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): JwtPayload => {
  const req = ctx.switchToHttp().getRequest();
  return req.user;
});

/** Injects the resolved tenant id (from host or authenticated user). */
export const CurrentTenant = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest();
  return req.tenantId ?? req.user?.tenantId ?? null;
});

/** Injects the resolved storefront tenant context (public routes). */
export const StoreContext = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.storeContext ?? null;
});
