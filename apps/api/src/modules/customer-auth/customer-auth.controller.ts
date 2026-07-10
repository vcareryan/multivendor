import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerAuthService } from './customer-auth.service';
import { Public } from '../../common/decorators';

@ApiTags('customer-auth')
@Public()
@Controller('customer-auth')
export class CustomerAuthController {
  constructor(private readonly customerAuth: CustomerAuthService) {}

  @Post('google')
  @ApiOperation({ summary: 'Sign in with Google (verifies ID token, issues customer session)' })
  google(@Body('idToken') idToken: string) {
    return this.customerAuth.googleSignIn(idToken);
  }

  @Post('session')
  @ApiOperation({ summary: 'Exchange a verified phone for a customer session' })
  session(@Body('phone') phone: string) {
    return this.customerAuth.sessionFromVerifiedPhone(phone);
  }
}
