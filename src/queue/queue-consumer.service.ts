import { Injectable, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { QUEUE_SERVICE } from './constants/queue.constants';
import { IQueueService, QueueMessage } from './interfaces/queue.interface';

@Injectable()
export class QueueConsumerService implements OnModuleInit {
  private readonly logger = new Logger(QueueConsumerService.name);

  constructor(@Inject(QUEUE_SERVICE) private readonly queueService: IQueueService) {}

  async onModuleInit() {
    // Uncomment to enable automatic message consumption on startup
    // await this.startConsuming();
    this.logger.log('QueueConsumerService initialized. Call startConsuming() to begin listening.');
  }

  async startConsuming() {
    this.logger.log('Starting queue consumer...');

    await this.queueService.subscribe(async (message: QueueMessage) => {
      await this.handleMessage(message);
    });
  }

  private async handleMessage(message: QueueMessage): Promise<void> {
    this.logger.log(`Processing message: ${message.id}`);
    this.logger.debug(`Message body: ${JSON.stringify(message.body)}`);

    try {
      // Process your message here
      // This is where you would implement your business logic
      // For example: Two-factor authentication processing, notifications, etc.

      // Example: Extract and process the message
      const { message: content, metadata } = message.body;

      this.logger.log(`Processed message content: ${content}`);
      if (metadata) {
        this.logger.log(`Message metadata: ${JSON.stringify(metadata)}`);
      }

      // Simulate processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      this.logger.log(`Successfully processed message: ${message.id}`);
    } catch (error) {
      this.logger.error(
        `Error processing message ${message.id}: ${error.message}`,
        error.stack,
      );
      throw error; // Re-throw to trigger message requeue/retry logic
    }
  }
}
