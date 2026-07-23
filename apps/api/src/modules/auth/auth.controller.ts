import { Body, Controller, ForbiddenException, Get, Post, Put, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import {
  changePasswordSchema,
  loginSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type JwtPayload,
  type LoginInput,
  type UpdateProfileInput,
} from '@utanstore/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Public, CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import type { TokenPair } from './token.service';
import type { Env } from '../../config/env.validation';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // NOTE: self-serve store registration is intentionally disabled. Stores are
  // created and shared by the super admin (POST /super/stores). The endpoint is
  // kept as a guarded 403 so any leftover client call fails safely.
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Disabled — stores are created by the super admin' })
  register(): never {
    throw new ForbiddenException('Self-serve registration is disabled. Please contact the platform administrator.');
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login (admin / staff / super-admin)' })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto, this.meta(req));
    if (result.requires2fa) return { requires2fa: true };
    this.setAuthCookies(res, result.tokens);
    return { role: result.role, tenantId: result.tenantId };
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate the refresh token and issue a new access token' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = this.readRefresh(req);
    if (!token) throw new UnauthorizedException('Missing refresh token');
    const tokens = await this.auth.refresh(token, this.meta(req));
    this.setAuthCookies(res, tokens);
    return { refreshed: true };
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Logout and revoke the refresh token' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(this.readRefresh(req));
    this.clearAuthCookies(res);
    return { loggedOut: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Current authenticated user' })
  me(@CurrentUser() user: JwtPayload) {
    return { id: user.sub, email: user.email, role: user.role, tenantId: user.tenantId };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get the authenticated user profile (name, email, phone, role)' })
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.auth.getProfile(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  @ApiOperation({ summary: 'Update own profile (name, phone)' })
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(updateProfileSchema)) dto: UpdateProfileInput,
  ) {
    return this.auth.updateProfile(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiOperation({ summary: 'Change own password (revokes other sessions, keeps this one)' })
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(changePasswordSchema)) dto: ChangePasswordInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const identity = await this.auth.changePassword(user.sub, dto.currentPassword, dto.newPassword);
    // Re-issue tokens for THIS device so the user stays signed in here.
    const tokens = await this.auth.issueFor(identity, this.meta(req));
    this.setAuthCookies(res, tokens);
    return { changed: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  @ApiOperation({ summary: 'Begin TOTP 2FA enrollment' })
  setup2fa(@CurrentUser() user: JwtPayload) {
    return this.auth.setup2fa(user.sub, user.email ?? '');
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/verify')
  @ApiOperation({ summary: 'Confirm TOTP 2FA enrollment' })
  async verify2fa(@CurrentUser() user: JwtPayload, @Body('token') token: string) {
    await this.auth.verify2fa(user.sub, token);
    return { enabled: true };
  }

  // ---- helpers ----
  private meta(req: Request) {
    return { ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  private readRefresh(req: Request): string | undefined {
    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
    return cookies?.['refresh_token'] ?? (req.body as { refreshToken?: string })?.refreshToken;
  }

  private setAuthCookies(res: Response, tokens: TokenPair): void {
    const isProd = this.config.get('NODE_ENV', { infer: true }) === 'production';
    const domain = this.config.get('COOKIE_DOMAIN', { infer: true });
    const common = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      domain: isProd ? domain : undefined,
      path: '/',
    };
    res.cookie('access_token', tokens.accessToken, { ...common, maxAge: tokens.accessTtl * 1000 });
    res.cookie('refresh_token', tokens.refreshToken, { ...common, maxAge: tokens.refreshTtl * 1000, path: '/api' });
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/api' });
  }
}
