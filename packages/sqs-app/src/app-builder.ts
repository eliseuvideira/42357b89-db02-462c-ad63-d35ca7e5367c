import { SQSClient } from "@aws-sdk/client-sqs";
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
  sqs: {
    region: string;
    endpoint?: string;
    credentials?: {
      accessKeyId: string;
      secretAccessKey: string;
    };
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  queues: SQSAppQueue<Context>[];
  context: Context;
};

export const SQSApp = async <Context extends { logger: Logger }>(
  params: SQSAppParams<Context>,
): Promise<App> => {
  const { sqs, redis, queues, context } = params;
  const logger = context.logger;

  const sqsClient = new SQSClient({
    region: sqs.region,
    endpoint: sqs.endpoint,
    credentials: sqs.credentials,
  });

  const redisClient = new Redis({
    host: redis.host,
    port: redis.port,
    password: redis.password,
    db: redis.db,
  });

  const consumers: Consumer[] = queues.map(({ url, handler }) => {
    const state: AppState = {
      sqsClient,
      redisClient,
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
  const stop = createStop(sqsClient, redisClient, consumers, logger);

  return { run, stop };
};
