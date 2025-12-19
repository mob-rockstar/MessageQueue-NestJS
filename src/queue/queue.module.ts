import { DynamicModule, Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_SERVICE, QUEUE_OPTIONS } from './constants/queue.constants';
import { IQueueService } from './interfaces/queue.interface';
import { SqsQueueService } from './providers/sqs-queue.service';
import { RabbitMqQueueService } from './providers/rabbitmq-queue.service';
import { CompositeQueueService } from './providers/composite-queue.service';
import { MockQueueService } from './providers/mock-queue.service';
import { QueueController } from './queue.controller';
import { QueueConsumerService } from './queue-consumer.service';

export interface QueueModuleOptions {
  provider: 'sqs' | 'rabbitmq' | 'both' | 'mock';
  sqs?: {
    region: string;
    endpoint?: string;
    queueUrl: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
  rabbitmq?: {
    url: string;
    queueName: string;
    exchangeName: string;
    routingKey: string;
  };
}

@Global()
@Module({})
export class QueueModule {
  static forRoot(): DynamicModule {
    return {
      module: QueueModule,
      imports: [ConfigModule],
      controllers: [QueueController],
      providers: [
        QueueConsumerService,
        {
          provide: QUEUE_OPTIONS,
          useFactory: (configService: ConfigService): QueueModuleOptions => ({
            provider: configService.get<'sqs' | 'rabbitmq' | 'both'>(
              'QUEUE_PROVIDER',
              'rabbitmq',
            ),
            sqs: {
              region: configService.get('AWS_REGION', 'us-east-1'),
              endpoint: configService.get('AWS_ENDPOINT'),
              queueUrl: configService.get('SQS_QUEUE_URL'),
              accessKeyId: configService.get('AWS_ACCESS_KEY_ID'),
              secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY'),
            },
            rabbitmq: {
              url: configService.get('RABBITMQ_URL', 'amqp://localhost:5672'),
              queueName: configService.get('RABBITMQ_QUEUE_NAME', 'test-queue'),
              exchangeName: configService.get('RABBITMQ_EXCHANGE_NAME', 'test-exchange'),
              routingKey: configService.get('RABBITMQ_ROUTING_KEY', 'test-routing-key'),
            },
          }),
          inject: [ConfigService],
        },
        SqsQueueService,
        RabbitMqQueueService,
        CompositeQueueService,
        MockQueueService,
        {
          provide: QUEUE_SERVICE,
          useFactory: (
            options: QueueModuleOptions,
            sqsService: SqsQueueService,
            rabbitMqService: RabbitMqQueueService,
            compositeService: CompositeQueueService,
            mockService: MockQueueService,
          ): IQueueService => {
            switch (options.provider) {
              case 'sqs':
                return sqsService;
              case 'rabbitmq':
                return rabbitMqService;
              case 'both':
                return compositeService;
              case 'mock':
                return mockService;
              default:
                throw new Error(`Unknown queue provider: ${options.provider}`);
            }
          },
          inject: [QUEUE_OPTIONS, SqsQueueService, RabbitMqQueueService, CompositeQueueService, MockQueueService],
        },
      ],
      exports: [QUEUE_SERVICE, QUEUE_OPTIONS, SqsQueueService, RabbitMqQueueService, MockQueueService],
    };
  }

  static forRootAsync(options: {
    imports?: any[];
    useFactory: (...args: any[]) => Promise<QueueModuleOptions> | QueueModuleOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: QueueModule,
      imports: options.imports || [],
      controllers: [QueueController],
      providers: [
        QueueConsumerService,
        {
          provide: QUEUE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        SqsQueueService,
        RabbitMqQueueService,
        CompositeQueueService,
        MockQueueService,
        {
          provide: QUEUE_SERVICE,
          useFactory: (
            moduleOptions: QueueModuleOptions,
            sqsService: SqsQueueService,
            rabbitMqService: RabbitMqQueueService,
            compositeService: CompositeQueueService,
            mockService: MockQueueService,
          ): IQueueService => {
            switch (moduleOptions.provider) {
              case 'sqs':
                return sqsService;
              case 'rabbitmq':
                return rabbitMqService;
              case 'both':
                return compositeService;
              case 'mock':
                return mockService;
              default:
                throw new Error(`Unknown queue provider: ${moduleOptions.provider}`);
            }
          },
          inject: [QUEUE_OPTIONS, SqsQueueService, RabbitMqQueueService, CompositeQueueService, MockQueueService],
        },
      ],
      exports: [QUEUE_SERVICE, QUEUE_OPTIONS, SqsQueueService, RabbitMqQueueService, MockQueueService],
    };
  }
}
