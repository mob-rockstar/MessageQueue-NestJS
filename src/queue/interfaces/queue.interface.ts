/**
 * Represents a message in the queue system
 * 
 * @example
 * {
 *   id: "msg-123",
 *   body: { message: "Hello", userId: "user-1" },
 *   attributes: { priority: "high" },
 *   timestamp: new Date()
 * }
 */
export interface QueueMessage {
  /** Unique identifier for the message (auto-generated if not provided) */
  id?: string;
  
  /** The actual content/data of the message (can be any JSON-serializable object) */
  body: any;
  
  /** Additional metadata about the message (e.g., userId, action type, priority) */
  attributes?: Record<string, any>;
  
  /** When the message was created/sent */
  timestamp?: Date;
}

/**
 * Options for publishing messages to the queue
 * 
 * @example
 * {
 *   delaySeconds: 30,  // Message will be delivered after 30 seconds
 *   messageAttributes: { priority: "high", userId: "user-123" }
 * }
 */
export interface PublishOptions {
  /** Delay message delivery by specified seconds (0-900) */
  delaySeconds?: number;
  
  /** Custom attributes/metadata to attach to the message */
  messageAttributes?: Record<string, any>;
}

/**
 * Options for receiving messages from the queue
 * 
 * @example
 * {
 *   maxNumberOfMessages: 10,  // Get up to 10 messages at once
 *   waitTimeSeconds: 20,       // Wait up to 20 seconds for messages
 *   visibilityTimeout: 30      // Hide messages for 30 seconds while processing
 * }
 */
export interface SubscribeOptions {
  /** Maximum number of messages to retrieve at once (1-10, default: 1) */
  maxNumberOfMessages?: number;
  
  /** How long to wait for messages if queue is empty (0-20 seconds, default: 0) */
  waitTimeSeconds?: number;
  
  /** How long messages stay hidden from other consumers while processing (seconds, default: 30) */
  visibilityTimeout?: number;
}

/**
 * Main Queue Service Interface
 * 
 * This interface defines all the operations you can perform with a queue:
 * - Send messages (publish)
 * - Receive messages (subscribe or receiveMessages)
 * - Delete messages after processing
 * - Get queue information
 * - Clean up resources
 * 
 * @example Basic Usage
 * ```typescript
 * // 1. Send a message
 * const messageId = await queueService.publish({
 *   message: "Hello Queue!",
 *   userId: "user-123"
 * });
 * 
 * // 2. Receive messages
 * const messages = await queueService.receiveMessages({ maxNumberOfMessages: 5 });
 * 
 * // 3. Process and delete
 * for (const msg of messages) {
 *   console.log(msg.body);
 *   await queueService.deleteMessage(msg.id);
 * }
 * ```
 */
export interface IQueueService {
  /**
   * Send a message to the queue
   * 
   * @param message - The data you want to send (will be automatically converted to JSON)
   * @param options - Optional settings (delay, attributes)
   * @returns Promise with the message ID
   * 
   * @example
   * const msgId = await queueService.publish({
   *   message: "Order created",
   *   orderId: "12345"
   * }, {
   *   delaySeconds: 10,  // Deliver after 10 seconds
   *   messageAttributes: { priority: "high" }
   * });
   */
  publish(message: any, options?: PublishOptions): Promise<string>;

  /**
   * Automatically receive and process messages as they arrive
   * This keeps running in the background, calling your callback for each message
   * 
   * @param callback - Function to call for each message (must return a Promise)
   * @returns Promise that resolves when subscription is set up
   * 
   * @example
   * await queueService.subscribe(async (message) => {
   *   console.log('Received:', message.body);
   *   // Process the message here
   *   // Message is automatically deleted after successful processing
   * });
   */
  subscribe(callback: (message: QueueMessage) => Promise<void>): Promise<void>;

  /**
   * Manually fetch messages from the queue (polling mode)
   * Use this when you want to control when to check for messages
   * 
   * @param options - Settings for how many messages to get and how long to wait
   * @returns Promise with array of messages (may be empty if no messages available)
   * 
   * @example
   * // Get up to 10 messages, wait max 20 seconds
   * const messages = await queueService.receiveMessages({
   *   maxNumberOfMessages: 10,
   *   waitTimeSeconds: 20
   * });
   * 
   * console.log(`Received ${messages.length} messages`);
   */
  receiveMessages(options?: SubscribeOptions): Promise<QueueMessage[]>;

  /**
   * Remove a message from the queue after processing
   * IMPORTANT: Always delete messages after successful processing to avoid re-processing
   * 
   * @param messageId - The ID of the message to delete
   * @returns Promise that resolves when message is deleted
   * 
   * @example
   * const messages = await queueService.receiveMessages();
   * for (const msg of messages) {
   *   try {
   *     // Process message
   *     await processOrder(msg.body);
   *     // Delete after successful processing
   *     await queueService.deleteMessage(msg.id);
   *   } catch (error) {
   *     console.error('Failed to process:', error);
   *     // Don't delete - message will become visible again
   *   }
   * }
   */
  deleteMessage(messageId: string): Promise<void>;

  /**
   * Get the queue name, URL, or identifier
   * Useful for logging or debugging
   * 
   * @returns The queue identifier (format depends on queue type)
   * 
   * @example
   * const queueName = queueService.getQueueIdentifier();
   * console.log('Using queue:', queueName);
   * // Output: "my-queue (in-memory)" or "https://sqs.amazonaws.com/..."
   */
  getQueueIdentifier(): string;

  /**
   * Clean up and close all connections
   * Call this when shutting down your application
   * 
   * @returns Promise that resolves when cleanup is complete
   * 
   * @example
   * // When app is shutting down
   * await queueService.close();
   */
  close(): Promise<void>;
}
