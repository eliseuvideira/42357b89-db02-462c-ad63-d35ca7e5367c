import { SQSClient } from "@aws-sdk/client-sqs";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import Redis from "ioredis";
import type { Message } from "@aws-sdk/client-sqs";
import type { Logger } from "./types/Logger";
import { createRun } from "./functions/create-run";
import { createStop } from "./functions/create-stop";
import { withMessageHandling } from "./functions/with-message-handling";
import type { App } from "./types/App";
import type { AppState } from "./types/AppState";
import type { MessageHandler } from "./types/MessageHandler";

export type Consumer = {
  queueUrl: string;
  state: AppState;
  handler: (message: Message) => Promise<void>;
};

export type SQSAppQueue<Context extends { logger: Logger }> = {
  url: string;
  handler: MessageHandler<Context>;
};

export type SQSAppParams<Context extends { logger: Logger }> = {
  sqsEndpoint?: string;
  redisUrl: string;
  queues: SQSAppQueue<Context>[];
  context: Context;
};

export const SQSApp = async <Context extends { logger: Logger }>(
  params: SQSAppParams<Context>,
): Promise<App> => {
  const { sqsEndpoint, redisUrl, queues, context } = params;
  const logger = context.logger;

  const requestHandler = new NodeHttpHandler({
    requestTimeout: 30000,
    connectionTimeout: 3000,
  });

  const sqsClient = new SQSClient({
    endpoint: sqsEndpoint,
    requestHandler,
  });

  const redisClient = new Redis(redisUrl);

  const consumers: Consumer[] = queues.map(({ url, handler }) => {
    const state: AppState = {
      sqsClient,
      redisClient,
      requestHandler,
      queueUrl: url,
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
      queueUrl: url,
      state,
      handler: wrappedHandler,
    };
  });

  const run = createRun(consumers, logger);
  const stop = createStop(sqsClient, redisClient, requestHandler, consumers, logger);

  return { run, stop };
};
