import { Body, Controller, Get, Headers, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CustomerAuthService } from './customer-auth.service';
import { Public } from '../../common/decorators';

@ApiTags('customer-auth')
@Public()
@Controller('customer-auth')
export class CustomerAuthController {
  constructor(private readonly customerAuth: CustomerAuthService) {}

  @Post('login/send')
  @ApiOperation({ summary: 'Send a login OTP to a phone number' })
  sendLoginOtp(@Body('phone') phone: string, @Req() req: Request) {
    return this.customerAuth.startLogin(phone, req.ip);
  }

  @Post('login/verify')
  @ApiOperation({ summary: 'Verify the login OTP and start a customer session' })
  verifyLoginOtp(@Body() body: { phone: string; code: string; name?: string }) {
    return this.customerAuth.verifyLogin(body.phone, body.code, body.name);
  }

  @Get('me')
  @ApiOperation({ summary: 'Current customer for a session token (Bearer)' })
  me(@Headers('authorization') auth?: string) {
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
    return this.customerAuth.me(token);
  }

  @Post('google')
  @ApiOperation({ summary: 'Sign in with Google (verifies ID token, issues customer session)' })
  google(@Body('idToken') idToken: string) {
    return this.customerAuth.googleSignIn(idToken);
  }
}
