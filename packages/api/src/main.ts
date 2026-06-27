import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cors from 'cors';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable validation pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));
  
  // ✅ FIXED CORS - Allow all origins for development
  app.use(cors({
    origin: true, // Allow any origin in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  }));
  
  // Security middleware
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));
  
  // Global prefix
  app.setGlobalPrefix('api');
  
  // Start server
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Quiz API running on http://localhost:${port}`);
}

bootstrap().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});