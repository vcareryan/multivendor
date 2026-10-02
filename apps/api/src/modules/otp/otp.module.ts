import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OtpService } from './otp.service';
import { Msg91SmsChannel } from './channels/msg91-sms.channel';
import { MetaWhatsAppChannel } from './channels/meta-whatsapp.channel';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [OtpService, Msg91SmsChannel, MetaWhatsAppChannel],
  exports: [OtpService],
})
export class OtpModule {}
