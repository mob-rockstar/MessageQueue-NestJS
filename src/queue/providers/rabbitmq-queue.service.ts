import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { ConsumeMessage, ConfirmChannel } from 'amqplib';
import { QUEUE_OPTIONS } from '../constants/queue.constants';
import {
  IQueueService,
  QueueMessage,
  PublishOptions,
  SubscribeOptions,
} from '../interfaces/queue.interface';
import { QueueModuleOptions } from '../queue.module';

@Injectable()
export class RabbitMqQueueService implements IQueueService, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqQueueService.name);
  private connection: amqp.AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;
  private queueName: string;
  private exchangeName: string;
  private routingKey: string;
  private isConnected = false;

  constructor(@Inject(QUEUE_OPTIONS) private options: QueueModuleOptions) {
    this.initializeRabbitMq();
  }

  private async initializeRabbitMq(): Promise<void> {
    const { rabbitmq } = this.options;

    if (!rabbitmq?.url) {
      this.logger.warn('RabbitMQ configuration is incomplete. Service will not be functional.');
      return;
    }

    this.queueName = rabbitmq.queueName;
    this.exchangeName = rabbitmq.exchangeName;
    this.routingKey = rabbitmq.routingKey;

    try {
      this.connection = amqp.connect([rabbitmq.url]);

      this.connection.on('connect', () => {
        this.logger.log('Connected to RabbitMQ');
        this.isConnected = true;
      });

      this.connection.on('disconnect', (err) => {
        this.logger.warn('Disconnected from RabbitMQ', err);
        this.isConnected = false;
      });

      this.connection.on('error', (err) => {
        this.logger.error('RabbitMQ connection error', err);
      });

      this.channelWrapper = this.connection.createChannel({
        setup: async (channel: ConfirmChannel) => {
          await channel.assertExchange(this.exchangeName, 'topic', { durable: true });
          await channel.assertQueue(this.queueName, { durable: true });
          await channel.bindQueue(this.queueName, this.exchangeName, this.routingKey);
          this.logger.log(`RabbitMQ queue '${this.queueName}' is ready`);
        },
      });

      await this.channelWrapper.waitForConnect();
    } catch (error) {
      this.logger.error(`Failed to initialize RabbitMQ: ${error.message}`, error.stack);
      throw error;
    }
  }

  async publish(message: any, options?: PublishOptions): Promise<string> {
    if (!this.isConnected) {
      throw new Error('RabbitMQ is not connected');
    }

    const messageBody = typeof message === 'string' ? message : JSON.stringify(message);
    const messageId = this.generateMessageId();

    try {
      await this.channelWrapper.publish(this.exchangeName, this.routingKey, Buffer.from(messageBody), {
        persistent: true,
        messageId,
        timestamp: Date.now(),
        headers: options?.messageAttributes,
      });

      this.logger.log(`Message published to RabbitMQ: ${messageId}`);
      return messageId;
    } catch (error) {
      this.logger.error(`Failed to publish message to RabbitMQ: ${error.message}`, error.stack);
      throw error;
    }
  }

  async subscribe(callback: (message: QueueMessage) => Promise<void>): Promise<void> {
    if (!this.isConnected) {
      throw new Error('RabbitMQ is not connected');
    }

    this.logger.log(`Starting RabbitMQ consumer for queue: ${this.queueName}`);

    await this.channelWrapper.addSetup((channel: ConfirmChannel) => {
      return channel.consume(
        this.queueName,
        async (msg: ConsumeMessage | null) => {
          if (!msg) return;

          try {
            const queueMessage = this.mapRabbitMqMessage(msg);
            await callback(queueMessage);
            channel.ack(msg);
            this.logger.debug(`Message acknowledged: ${queueMessage.id}`);
          } catch (error) {
            this.logger.error(
              `Error processing RabbitMQ message: ${error.message}`,
              error.stack,
            );
            channel.nack(msg, false, true); // Requeue the message
          }
        },
        { noAck: false },
      );
    });
  }

  async receiveMessages(options?: SubscribeOptions): Promise<QueueMessage[]> {
    if (!this.isConnected) {
      throw new Error('RabbitMQ is not connected');
    }

    const messages: QueueMessage[] = [];
    const maxMessages = options?.maxNumberOfMessages || 10;

    return new Promise((resolve, reject) => {
      this.channelWrapper
        .addSetup(async (channel: ConfirmChannel) => {
          for (let i = 0; i < maxMessages; i++) {
            const msg = await channel.get(this.queueName, { noAck: false });
            if (msg) {
              messages.push(this.mapRabbitMqMessage(msg));
            } else {
              break;
            }
          }
          resolve(messages);
        })
        .catch(reject);
    });
  }

  async deleteMessage(messageId: string): Promise<void> {
    // For RabbitMQ, message deletion is handled via acknowledgment
    // This is a no-op for the manual polling scenario
    this.logger.debug(`Message deletion requested for: ${messageId}`);
  }

  getQueueIdentifier(): string {
    return `${this.exchangeName}/${this.queueName}`;
  }

  async close(): Promise<void> {
    try {
      if (this.channelWrapper) {
        await this.channelWrapper.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isConnected = false;
      this.logger.log('RabbitMQ connection closed');
    } catch (error) {
      this.logger.error(`Error closing RabbitMQ connection: ${error.message}`, error.stack);
    }
  }

  async onModuleDestroy() {
    await this.close();
  }

  private mapRabbitMqMessage(msg: ConsumeMessage | any): QueueMessage {
    let body: any;
    try {
      body = JSON.parse(msg.content.toString());
    } catch {
      body = msg.content.toString();
    }

    return {
      id: msg.properties?.messageId || msg.fields?.deliveryTag?.toString(),
      body,
      attributes: {
        ...msg.properties,
        ...msg.fields,
      },
      timestamp: msg.properties?.timestamp
        ? new Date(msg.properties.timestamp)
        : new Date(),
    };
  }

  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
