import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  Message,
} from '@aws-sdk/client-sqs';
import { QUEUE_OPTIONS } from '../constants/queue.constants';
import {
  IQueueService,
  QueueMessage,
  PublishOptions,
  SubscribeOptions,
} from '../interfaces/queue.interface';
import { QueueModuleOptions } from '../queue.module';

@Injectable()
export class SqsQueueService implements IQueueService, OnModuleDestroy {
  private readonly logger = new Logger(SqsQueueService.name);
  private sqsClient: SQSClient;
  private queueUrl: string;
  private isPolling = false;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor(@Inject(QUEUE_OPTIONS) private options: QueueModuleOptions) {
    this.initializeSqsClient();
  }

  private initializeSqsClient(): void {
    const { sqs } = this.options;
    
    if (!sqs?.queueUrl) {
      this.logger.warn('SQS configuration is incomplete. Service will not be functional.');
      return;
    }

    this.queueUrl = sqs.queueUrl;

    const clientConfig: any = {
      region: sqs.region || 'us-east-1',
    };

    if (sqs.endpoint) {
      clientConfig.endpoint = sqs.endpoint;
    }

    if (sqs.accessKeyId && sqs.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: sqs.accessKeyId,
        secretAccessKey: sqs.secretAccessKey,
      };
    }

    this.sqsClient = new SQSClient(clientConfig);
    this.logger.log(`SQS Client initialized for queue: ${this.queueUrl}`);
  }

  async publish(message: any, options?: PublishOptions): Promise<string> {
    if (!this.sqsClient) {
      throw new Error('SQS client is not initialized');
    }

    const messageBody = typeof message === 'string' ? message : JSON.stringify(message);

    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: messageBody,
      DelaySeconds: options?.delaySeconds,
      MessageAttributes: this.formatMessageAttributes(options?.messageAttributes),
    });

    try {
      const response = await this.sqsClient.send(command);
      this.logger.log(`Message published to SQS: ${response.MessageId}`);
      return response.MessageId!;
    } catch (error) {
      this.logger.error(`Failed to publish message to SQS: ${error.message}`, error.stack);
      throw error;
    }
  }

  async subscribe(callback: (message: QueueMessage) => Promise<void>): Promise<void> {
    if (!this.sqsClient) {
      throw new Error('SQS client is not initialized');
    }

    this.isPolling = true;
    this.logger.log('Starting SQS message polling...');

    const poll = async () => {
      if (!this.isPolling) return;

      try {
        const messages = await this.receiveMessages({
          maxNumberOfMessages: 10,
          waitTimeSeconds: 20,
        });

        for (const message of messages) {
          try {
            await callback(message);
            await this.deleteMessage(message.id!);
          } catch (error) {
            this.logger.error(
              `Error processing SQS message ${message.id}: ${error.message}`,
              error.stack,
            );
          }
        }
      } catch (error) {
        this.logger.error(`Error polling SQS: ${error.message}`, error.stack);
      }

      if (this.isPolling) {
        this.pollingInterval = setTimeout(poll, 1000);
      }
    };

    poll();
  }

  async receiveMessages(options?: SubscribeOptions): Promise<QueueMessage[]> {
    if (!this.sqsClient) {
      throw new Error('SQS client is not initialized');
    }

    const command = new ReceiveMessageCommand({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: options?.maxNumberOfMessages || 10,
      WaitTimeSeconds: options?.waitTimeSeconds || 10,
      VisibilityTimeout: options?.visibilityTimeout || 30,
      MessageAttributeNames: ['All'],
      AttributeNames: ['All'],
    });

    try {
      const response = await this.sqsClient.send(command);
      return (response.Messages || []).map((msg) => this.mapSqsMessage(msg));
    } catch (error) {
      this.logger.error(`Failed to receive messages from SQS: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    if (!this.sqsClient) {
      throw new Error('SQS client is not initialized');
    }

    const command = new DeleteMessageCommand({
      QueueUrl: this.queueUrl,
      ReceiptHandle: messageId,
    });

    try {
      await this.sqsClient.send(command);
      this.logger.debug(`Message deleted from SQS: ${messageId}`);
    } catch (error) {
      this.logger.error(`Failed to delete message from SQS: ${error.message}`, error.stack);
      throw error;
    }
  }

  getQueueIdentifier(): string {
    return this.queueUrl;
  }

  async close(): Promise<void> {
    this.isPolling = false;
    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval);
      this.pollingInterval = null;
    }
    if (this.sqsClient) {
      this.sqsClient.destroy();
    }
    this.logger.log('SQS client closed');
  }

  async onModuleDestroy() {
    await this.close();
  }

  private mapSqsMessage(message: Message): QueueMessage {
    let body: any;
    try {
      body = JSON.parse(message.Body || '{}');
    } catch {
      body = message.Body;
    }

    return {
      id: message.ReceiptHandle,
      body,
      attributes: {
        messageId: message.MessageId,
        ...message.Attributes,
        ...message.MessageAttributes,
      },
      timestamp: message.Attributes?.SentTimestamp
        ? new Date(parseInt(message.Attributes.SentTimestamp))
        : new Date(),
    };
  }

  private formatMessageAttributes(attributes?: Record<string, any>): any {
    if (!attributes) return undefined;

    return Object.entries(attributes).reduce(
      (acc, [key, value]) => {
        acc[key] = {
          DataType: 'String',
          StringValue: typeof value === 'string' ? value : JSON.stringify(value),
        };
        return acc;
      },
      {} as Record<string, any>,
    );
  }
}
