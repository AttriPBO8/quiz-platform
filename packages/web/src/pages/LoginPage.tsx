import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Paper, Typography, TextField, Button, Box, Alert } from '@mui/material';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState('9999999999');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('Test User');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');

  // Step 1: Send OTP
  const handleSendOTP = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/auth/otp`, {
        phoneNumber: phoneNumber.replace('+', ''),
        countryCode: '+91'
      });
      
      if (response.status === 200 || response.status === 201) {
        setStep('otp');
        // In dev mode, show the OTP
        alert('📱 OTP sent! In dev mode, use: 123456');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/auth/verify`, {
        phoneNumber: phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`,
        otp: otp || '123456',
        fullName: fullName
      });
      
      if (response.status === 200 || response.status === 201) {
        const data = response.data;
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        navigate('/quiz');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP. Use 123456 in dev mode.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Login - Bypass OTP
  const handleQuickLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/auth/verify`, {
        phoneNumber: `+91${phoneNumber}`,
        otp: '123456',
        fullName: 'Test User'
      });
      
      if (response.status === 200 || response.status === 201) {
        const data = response.data;
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        navigate('/quiz');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Quick login failed. Make sure backend is running.');
      console.error('Quick login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom align="center">
            🎯 Quiz Platform
          </Typography>
          <Typography variant="subtitle1" gutterBottom align="center" color="textSecondary">
            Development Mode - No Real OTP Required
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {step === 'phone' ? (
            <Box>
              <TextField
                fullWidth
                label="Phone Number"
                placeholder="9999999999"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                sx={{ mb: 2 }}
                disabled={loading}
                helperText="Use any number in dev mode"
              />
              
              <Button
                fullWidth
                variant="contained"
                onClick={handleSendOTP}
                disabled={loading || phoneNumber.length < 10}
                sx={{ mb: 1 }}
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </Button>
              
              <Button
                fullWidth
                variant="outlined"
                onClick={handleQuickLogin}
                disabled={loading}
                color="success"
              >
                ⚡ Quick Login (Bypass OTP)
              </Button>
              
              <Typography variant="caption" align="center" display="block" sx={{ mt: 2 }}>
                💡 In dev mode, use OTP: 123456
              </Typography>
            </Box>
          ) : (
            <Box>
              <TextField
                fullWidth
                label="Enter OTP"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                sx={{ mb: 2 }}
                disabled={loading}
                helperText="Use 123456 in dev mode"
              />
              
              <Button
                fullWidth
                variant="contained"
                onClick={handleVerifyOTP}
                disabled={loading || otp.length < 6}
                sx={{ mb: 1 }}
              >
                {loading ? 'Verifying...' : 'Verify & Login'}
              </Button>
              
              <Button
                fullWidth
                variant="text"
                onClick={() => setStep('phone')}
                disabled={loading}
              >
                ← Back to Phone
              </Button>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};