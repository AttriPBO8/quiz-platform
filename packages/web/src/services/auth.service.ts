import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    phoneNumber: string;
    fullName: string;
    role: string;
  };
}

export class AuthService {
  async sendOTP(phoneNumber: string): Promise<void> {
    const response = await axios.post(`${API_URL}/auth/otp`, {
      phoneNumber: phoneNumber.replace('+', ''),
      countryCode: '+91'
    });
    
    if (response.status !== 201 && response.status !== 200) {
      throw new Error('Failed to send OTP');
    }
  }

  async verifyOTP(phoneNumber: string, otp: string, fullName?: string): Promise<LoginResponse> {
    const response = await axios.post(`${API_URL}/auth/verify`, {
      phoneNumber: phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`,
      otp: otp || '123456',
      fullName: fullName || 'Test User'
    });

    if (response.status !== 200 && response.status !== 201) {
      throw new Error('OTP verification failed');
    }

    const data = response.data;
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data;
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }
}

export const authService = new AuthService();