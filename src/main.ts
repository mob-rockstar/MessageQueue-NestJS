import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Serve static files
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS
  app.enableCors();

  const configService = app.get(ConfigService);
  const port = configService.get('PORT', 3000);
  const queueProvider = configService.get('QUEUE_PROVIDER', 'rabbitmq');

  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Queue Provider: ${queueProvider}`);
  logger.log(`Health Check: http://localhost:${port}/queue/info`);
  logger.log(`API Documentation:`);
  logger.log(`  - POST http://localhost:${port}/queue/publish`);
  logger.log(`  - GET  http://localhost:${port}/queue/receive`);
}

bootstrap();
