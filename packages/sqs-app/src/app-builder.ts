import { SQSClient } from "@aws-sdk/client-sqs";
import Redis from "ioredis";
import type { Logger } from "./types/Logger";
import { createRun } from "./functions/create-run";
import { createStop } from "./functions/create-stop";
import { createConsumers } from "./functions/create-consumers";
import type { App } from "./types/App";
import type { SQSAppParams } from "./types/SQSAppParams";

export const SQSApp = async <Context extends { logger: Logger }>(
  params: SQSAppParams<Context>,
): Promise<App> => {
  const { sqs, redis, queues, context } = params;
  const logger = context.logger;

  const sqsClient = new SQSClient({
    endpoint: sqs.endpoint,
  });

  const redisClient = new Redis(redis.url);

  const consumers = createConsumers({
    sqsClient,
    redisClient,
    queues,
    context,
  });

  const run = createRun({ consumers, logger });
  const stop = createStop({ sqsClient, redisClient, consumers, logger });

  logger.debug("App initialized", { queues: consumers.length });

  return { run, stop };
};
