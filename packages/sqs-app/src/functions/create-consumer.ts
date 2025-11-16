import type { SQSClient } from "@aws-sdk/client-sqs";
import type { Redis } from "ioredis";
import type { AppState } from "../types/AppState";
import type { Consumer } from "../types/Consumer";
import type { Logger } from "../types/Logger";
import type { SQSAppQueue } from "../types/SQSAppQueue";
import { withMessageHandling } from "./with-message-handling";

type CreateConsumerParams<Context extends { logger: Logger }> = {
  sqsClient: SQSClient;
  redisClient: Redis;
  queue: SQSAppQueue<Context>;
  context: Context;
};

export const createConsumer = <Context extends { logger: Logger }>({
  sqsClient,
  redisClient,
  queue,
  context,
}: CreateConsumerParams<Context>): Consumer => {
  const state: AppState = {
    sqsClient,
    redisClient,
    abortController: new AbortController(),
    queue: { url: queue.url },
    isShuttingDown: false,
    pollingActive: false,
    inFlightMessages: 0,
  };

  const wrappedHandler = withMessageHandling<Context>({
    handler: queue.handler,
    state,
    context,
  });

  return {
    queue: {
      url: queue.url,
      polling: {
        batchSize: queue.polling?.batchSize ?? 10,
        waitTimeSeconds: queue.polling?.waitTimeSeconds ?? 20,
      },
    },
    state,
    handler: wrappedHandler,
  };
};
