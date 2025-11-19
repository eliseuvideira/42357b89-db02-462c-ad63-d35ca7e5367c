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
    throw new Error("Failed to connect to Redis", {
      cause: error,
    });
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
      throw new Error(`Queue not found: ${queue.url}`, {
        cause: error,
      });
    }
  }

  logger.debug("All queues verified", { count: queues.length });
};
