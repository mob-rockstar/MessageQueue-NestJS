import { Injectable, Logger } from '@nestjs/common';
import {
  IQueueService,
  QueueMessage,
  PublishOptions,
  SubscribeOptions,
} from '../interfaces/queue.interface';

/**
 * Mock queue service for testing without external dependencies
 */
@Injectable()
export class MockQueueService implements IQueueService {
  private readonly logger = new Logger(MockQueueService.name);
  private messages: QueueMessage[] = [];
  private messageIdCounter = 0;

  async publish(message: any, options?: PublishOptions): Promise<string> {
    const messageId = `mock-msg-${++this.messageIdCounter}`;
    
    const queueMessage: QueueMessage = {
      id: messageId,
      body: typeof message === 'string' ? message : message,
      attributes: options?.messageAttributes,
      timestamp: new Date(),
    };

    this.messages.push(queueMessage);
    this.logger.log(`Message published: ${messageId}`);
    
    return messageId;
  }

  async subscribe(callback: (message: QueueMessage) => Promise<void>): Promise<void> {
    this.logger.log('Mock subscriber started (processes messages every 2 seconds)');
    
    setInterval(async () => {
      if (this.messages.length > 0) {
        const message = this.messages.shift()!;
        try {
          await callback(message);
          this.logger.log(`Message processed: ${message.id}`);
        } catch (error) {
          this.logger.error(`Error processing message: ${error.message}`);
          this.messages.push(message); // Re-queue on error
        }
      }
    }, 2000);
  }

  async receiveMessages(options?: SubscribeOptions): Promise<QueueMessage[]> {
    const maxMessages = options?.maxNumberOfMessages || 10;
    const messages = this.messages.splice(0, maxMessages);
    
    this.logger.log(`Retrieved ${messages.length} messages (${this.messages.length} remaining in queue)`);
    return messages;
  }

  async deleteMessage(messageId: string): Promise<void> {
    this.messages = this.messages.filter(msg => msg.id !== messageId);
    this.logger.debug(`Message deleted: ${messageId}`);
  }

  getQueueIdentifier(): string {
    return 'mock-queue (in-memory)';
  }

  async close(): Promise<void> {
    this.messages = [];
    this.logger.log('Mock queue service closed');
  }

  // Helper method to get queue size
  getQueueSize(): number {
    return this.messages.length;
  }
}
