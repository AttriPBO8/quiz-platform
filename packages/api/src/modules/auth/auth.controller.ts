import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('otp')
  @HttpCode(HttpStatus.OK)
  async sendOTP(@Body() body: { phoneNumber: string; countryCode: string }) {
    return this.authService.generateOTP(body);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyOTP(@Body() body: { phoneNumber: string; otp: string; fullName?: string }) {
    return this.authService.verifyOTP({
      phoneNumber: body.phoneNumber,
      otp: body.otp,
      fullName: body.fullName
    });
  }
}