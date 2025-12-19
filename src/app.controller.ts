import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getWelcome() {
    return {
      message: 'NestJS Queue API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        queueInfo: 'GET /queue/info',
        publishMessage: 'POST /queue/publish',
        receiveMessages: 'GET /queue/receive',
      },
      documentation: {
        readme: 'See README.md for complete documentation',
        quickstart: 'See QUICKSTART.md to get started',
        examples: 'See API-EXAMPLES.md for usage examples',
      },
      queue: {
        provider: process.env.QUEUE_PROVIDER || 'mock',
        status: 'operational',
      },
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
