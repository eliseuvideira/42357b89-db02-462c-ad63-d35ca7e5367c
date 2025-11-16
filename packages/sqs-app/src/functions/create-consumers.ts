import type { SQSClient } from "@aws-sdk/client-sqs";
import type { Redis } from "ioredis";
import type { Consumer } from "../types/Consumer";
import type { Logger } from "../types/Logger";
import type { SQSAppQueue } from "../types/SQSAppQueue";
import { createConsumer } from "./create-consumer";

type CreateConsumersParams<Context extends { logger: Logger }> = {
  sqsClient: SQSClient;
  redisClient: Redis;
  queues: SQSAppQueue<Context>[];
  context: Context;
};

export const createConsumers = <Context extends { logger: Logger }>({
  sqsClient,
  redisClient,
  queues,
  context,
}: CreateConsumersParams<Context>): Consumer[] => {
  return queues.map((queue) =>
    createConsumer({
      sqsClient,
      redisClient,
      queue,
      context,
    }),
  );
};
