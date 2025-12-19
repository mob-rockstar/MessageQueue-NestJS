import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export enum QueueProvider {
  SQS = 'sqs',
  RABBITMQ = 'rabbitmq',
  BOTH = 'both',
}

export class PublishMessageDto {
  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsEnum(QueueProvider)
  targetQueue?: QueueProvider;
}

export class ReceiveMessagesDto {
  @IsOptional()
  maxMessages?: number = 10;

  @IsOptional()
  waitTimeSeconds?: number = 10;
}
