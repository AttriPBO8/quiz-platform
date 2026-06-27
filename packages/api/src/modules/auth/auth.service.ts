import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async generateOTP(request: { phoneNumber: string; countryCode: string }) {
    console.log(`📱 OTP requested for: ${request.phoneNumber}`);
    return {
      message: 'OTP sent successfully (DEV MODE: use 123456)',
      expiresIn: 300
    };
  }

  async verifyOTP(verification: { phoneNumber: string; otp: string; fullName?: string }) {
    console.log(`🔐 Verifying OTP for: ${verification.phoneNumber}, OTP: ${verification.otp}`);
    
    // In dev mode, accept any phone number with OTP 123456
    if (verification.otp === '123456') {
      const payload = {
        sub: 'dev_user_001',
        phoneNumber: verification.phoneNumber,
        fullName: verification.fullName || 'Dev User',
        role: 'user',
      };

      return {
        accessToken: this.jwtService.sign(payload),
        refreshToken: this.jwtService.sign(payload, { expiresIn: '30d' }),
        user: {
          id: 'dev_user_001',
          phoneNumber: verification.phoneNumber,
          fullName: verification.fullName || 'Dev User',
          role: 'user',
        },
      };
    }

    throw new UnauthorizedException('Invalid OTP. Use 123456 in dev mode.');
  }
}