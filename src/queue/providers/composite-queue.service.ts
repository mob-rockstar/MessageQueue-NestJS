import { Injectable, Logger } from '@nestjs/common';
import {
  IQueueService,
  QueueMessage,
  PublishOptions,
  SubscribeOptions,
} from '../interfaces/queue.interface';
import { SqsQueueService } from './sqs-queue.service';
import { RabbitMqQueueService } from './rabbitmq-queue.service';

/**
 * CompositeQueueService allows using both SQS and RabbitMQ simultaneously.
 * This is useful for testing or migrating between queue providers.
 */
@Injectable()
export class CompositeQueueService implements IQueueService {
  private readonly logger = new Logger(CompositeQueueService.name);

  constructor(
    private readonly sqsService: SqsQueueService,
    private readonly rabbitMqService: RabbitMqQueueService,
  ) {
    this.logger.log('CompositeQueueService initialized with both SQS and RabbitMQ');
  }

  async publish(message: any, options?: PublishOptions): Promise<string> {
    this.logger.log('Publishing message to both SQS and RabbitMQ');

    const results = await Promise.allSettled([
      this.sqsService.publish(message, options),
      this.rabbitMqService.publish(message, options),
    ]);

    const successfulIds: string[] = [];
    const errors: Error[] = [];

    results.forEach((result, index) => {
      const provider = index === 0 ? 'SQS' : 'RabbitMQ';
      if (result.status === 'fulfilled') {
        successfulIds.push(result.value);
        this.logger.log(`Message published successfully to ${provider}: ${result.value}`);
      } else {
        this.logger.error(`Failed to publish to ${provider}: ${result.reason.message}`);
        errors.push(result.reason);
      }
    });

    if (successfulIds.length === 0) {
      throw new Error('Failed to publish message to any queue provider');
    }

    return successfulIds.join(',');
  }

  async subscribe(callback: (message: QueueMessage) => Promise<void>): Promise<void> {
    this.logger.log('Starting subscription on both SQS and RabbitMQ');

    await Promise.all([
      this.sqsService.subscribe(async (msg) => {
        this.logger.debug(`Message received from SQS: ${msg.id}`);
        await callback(msg);
      }),
      this.rabbitMqService.subscribe(async (msg) => {
        this.logger.debug(`Message received from RabbitMQ: ${msg.id}`);
        await callback(msg);
      }),
    ]);
  }

  async receiveMessages(options?: SubscribeOptions): Promise<QueueMessage[]> {
    this.logger.log('Receiving messages from both SQS and RabbitMQ');

    const [sqsMessages, rabbitMqMessages] = await Promise.all([
      this.sqsService.receiveMessages(options).catch((err) => {
        this.logger.error(`Failed to receive from SQS: ${err.message}`);
        return [];
      }),
      this.rabbitMqService.receiveMessages(options).catch((err) => {
        this.logger.error(`Failed to receive from RabbitMQ: ${err.message}`);
        return [];
      }),
    ]);

    this.logger.log(`Received ${sqsMessages.length} messages from SQS, ${rabbitMqMessages.length} messages from RabbitMQ`);
    
    if (sqsMessages.length > 0) {
      this.logger.log(`SQS message IDs: ${sqsMessages.map(m => m.id).join(', ')}`);
    }
    
    if (rabbitMqMessages.length > 0) {
      this.logger.log(`RabbitMQ message IDs: ${rabbitMqMessages.map(m => m.id).join(', ')}`);
    }

    return [...sqsMessages, ...rabbitMqMessages];
  }

  async deleteMessage(messageId: string): Promise<void> {
    // Try to delete from both services
    await Promise.allSettled([
      this.sqsService.deleteMessage(messageId),
      this.rabbitMqService.deleteMessage(messageId),
    ]);
  }

  getQueueIdentifier(): string {
    return `composite[${this.sqsService.getQueueIdentifier()},${this.rabbitMqService.getQueueIdentifier()}]`;
  }

  async close(): Promise<void> {
    await Promise.all([this.sqsService.close(), this.rabbitMqService.close()]);
    this.logger.log('Both queue services closed');
  }
}
