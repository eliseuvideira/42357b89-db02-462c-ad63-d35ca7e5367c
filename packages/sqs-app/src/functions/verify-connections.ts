import { GetQueueAttributesCommand, type SQSClient } from "@aws-sdk/client-sqs";
import type { Redis } from "ioredis";
import type { Logger } from "../types/Logger";

export const verifyConnections = async <T extends { url: string }>(
  sqsClient: SQSClient,
  redisClient: Redis,
  queues: T[],
  logger: Logger,
): Promise<void> => {
  try {
    await redisClient.ping();
    logger.debug("Redis connection verified");
  } catch (error) {
    logger.debug("Redis connection failed", { error });
    throw new Error("Failed to connect to Redis");
  }

  for (const queue of queues) {
    try {
      await sqsClient.send(
        new GetQueueAttributesCommand({
          QueueUrl: queue.url,
          AttributeNames: ["QueueArn"],
        }),
      );
      logger.debug("Queue verified", { queueUrl: queue.url });
    } catch (error) {
      logger.debug("Queue verification failed", { queueUrl: queue.url, error });
      throw new Error(`Queue not found: ${queue.url}`);
    }
  }

  logger.debug("All queues verified", { count: queues.length });
};
