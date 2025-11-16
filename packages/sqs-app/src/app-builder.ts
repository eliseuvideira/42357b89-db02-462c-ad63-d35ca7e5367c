import { SQSClient } from "@aws-sdk/client-sqs";
import Redis from "ioredis";
import type { Logger } from "./types/Logger";
import { createRun } from "./functions/create-run";
import { createStop } from "./functions/create-stop";
import { withMessageHandling } from "./functions/with-message-handling";
import type { App } from "./types/App";
import type { AppState } from "./types/AppState";
import type { Consumer } from "./types/Consumer";
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

  const consumers: Consumer[] = queues.map(({ url, handler, polling }) => {
    const state: AppState = {
      sqsClient,
      redisClient,
      abortController: new AbortController(),
      queue: {
        url,
      },
      isShuttingDown: false,
      pollingActive: false,
      inFlightMessages: 0,
    };

    const wrappedHandler = withMessageHandling<Context>(
      handler,
      logger,
      state,
      context,
    );

    return {
      queue: {
        url,
        polling: {
          batchSize: polling?.batchSize ?? 10,
          waitTimeSeconds: polling?.waitTimeSeconds ?? 20,
        },
      },
      state,
      handler: wrappedHandler,
    };
  });

  const run = createRun(consumers, logger);
  const stop = createStop(sqsClient, redisClient, consumers, logger);

  return { run, stop };
};
