import { ListQueuesCommand, type SQSClient } from "@aws-sdk/client-sqs";
import type { Redis } from "ioredis";
import type { Logger } from "../types/Logger";

export const verifyConnections = async (
  sqsClient: SQSClient,
  redisClient: Redis,
  logger: Logger,
): Promise<void> => {
  try {
    await redisClient.ping();
    logger.debug("Redis connection verified");
  } catch (error) {
    logger.debug("Redis connection failed", { error });
    throw new Error("Failed to connect to Redis");
  }

  try {
    await sqsClient.send(new ListQueuesCommand({}));
    logger.debug("SQS connection verified");
  } catch (error) {
    logger.debug("SQS connection failed", { error });
    throw new Error("Failed to connect to SQS");
  }
};
