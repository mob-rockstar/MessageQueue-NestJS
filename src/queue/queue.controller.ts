import { Controller, Post, Get, Delete, Body, Inject, Logger, Query } from '@nestjs/common';
import { QUEUE_SERVICE } from './constants/queue.constants';
import { IQueueService } from './interfaces/queue.interface';
import { PublishMessageDto, ReceiveMessagesDto } from './dto/queue.dto';

@Controller('queue')
export class QueueController {
  private readonly logger = new Logger(QueueController.name);

  constructor(@Inject(QUEUE_SERVICE) private readonly queueService: IQueueService) {}

  @Post('publish')
  async publishMessage(@Body() publishDto: PublishMessageDto) {
    this.logger.log(`Publishing message: ${JSON.stringify(publishDto)}`);

    try {
      const messageId = await this.queueService.publish(
        {
          message: publishDto.message,
          metadata: publishDto.metadata,
          timestamp: new Date().toISOString(),
        },
        {
          messageAttributes: publishDto.metadata,
        },
      );

      return {
        success: true,
        messageId,
        queueIdentifier: this.queueService.getQueueIdentifier(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to publish message: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('receive')
  async receiveMessages(@Query() receiveDto: ReceiveMessagesDto) {
    this.logger.log('Receiving messages from queue');

    try {
      const messages = await this.queueService.receiveMessages({
        maxNumberOfMessages: receiveDto.maxMessages || 10,
        waitTimeSeconds: receiveDto.waitTimeSeconds || 10,
      });

      return {
        success: true,
        count: messages.length,
        messages: messages.map((msg) => ({
          id: msg.id,
          body: msg.body,
          attributes: msg.attributes,
          timestamp: msg.timestamp,
        })),
        queueIdentifier: this.queueService.getQueueIdentifier(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to receive messages: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('info')
  getQueueInfo() {
    return {
      queueIdentifier: this.queueService.getQueueIdentifier(),
      timestamp: new Date().toISOString(),
    };
  }

  @Post('publish-bulk')
  async publishBulkMessages(@Body('count') count: number = 5) {
    this.logger.log(`Publishing ${count} test messages`);

    try {
      const results = [];
      const startTime = Date.now();

      for (let i = 1; i <= count; i++) {
        const messageId = await this.queueService.publish(
          {
            message: `Test message #${i}`,
            metadata: {
              testNumber: i,
              batch: true,
              timestamp: new Date().toISOString(),
            },
          },
          {
            messageAttributes: {
              testNumber: i.toString(),
              batch: 'true',
            },
          },
        );

        results.push({
          messageNumber: i,
          messageId,
          timestamp: new Date().toISOString(),
        });

        this.logger.log(`Published message ${i}/${count}: ${messageId}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        success: true,
        totalPublished: count,
        messages: results,
        queueIdentifier: this.queueService.getQueueIdentifier(),
        durationMs: duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to publish bulk messages: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Delete('clear')
  async clearAllMessages() {
    this.logger.log('Clearing all messages from queue');

    try {
      // Receive all messages
      const messages = await this.queueService.receiveMessages({
        maxNumberOfMessages: 10,
      });

      let totalCleared = messages.length;
      this.logger.log(`Found ${messages.length} messages to clear`);

      // Delete all received messages
      for (const msg of messages) {
        await this.queueService.deleteMessage(msg.id);
        this.logger.debug(`Deleted message: ${msg.id}`);
      }

      // Keep clearing until no more messages
      let additionalMessages = await this.queueService.receiveMessages({
        maxNumberOfMessages: 10,
      });

      while (additionalMessages.length > 0) {
        totalCleared += additionalMessages.length;
        for (const msg of additionalMessages) {
          await this.queueService.deleteMessage(msg.id);
          this.logger.debug(`Deleted message: ${msg.id}`);
        }
        additionalMessages = await this.queueService.receiveMessages({
          maxNumberOfMessages: 10,
        });
      }

      this.logger.log(`Successfully cleared ${totalCleared} messages`);

      return {
        success: true,
        messagesCleared: totalCleared,
        queueIdentifier: this.queueService.getQueueIdentifier(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to clear messages: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
