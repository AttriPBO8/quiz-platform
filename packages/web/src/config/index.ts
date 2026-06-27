export const config = {
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  appName: 'Quiz Platform',
  isDev: process.env.NODE_ENV === 'development'
};