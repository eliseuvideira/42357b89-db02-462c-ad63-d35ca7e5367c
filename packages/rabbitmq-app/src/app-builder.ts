import amqplib from "amqplib";
import type { Message } from "amqplib";
import type { Logger } from "./types/Logger";
import { createRun } from "./functions/create-run";
import { createStop } from "./functions/create-stop";
import { withMessageHandling } from "./functions/with-message-handling";
import type { App } from "./types/App";
import type { AppState } from "./types/AppState";
import type { MessageHandler } from "./types/MessageHandler";

type Consumer = {
  queue: string;
  state: AppState;
  handler: (message: Message | null) => Promise<void>;
};

export type RabbitMQAppQueue<Context extends { logger: Logger }> = {
  name: string;
  handler: MessageHandler<Context>;
};

export type RabbitMQAppParams<Context extends { logger: Logger }> = {
  url: string;
  queues: RabbitMQAppQueue<Context>[];
  context: Context;
};

export const RabbitMQApp = async <Context extends { logger: Logger }>(
  params: RabbitMQAppParams<Context>,
): Promise<App> => {
  const { url, queues, context } = params;
  const logger = context.logger;

  const connection = await amqplib.connect(url);

  const consumers: Consumer[] = await Promise.all(
    queues.map(async ({ name, handler }) => {
      const channel = await connection.createChannel();
      await channel.assertQueue(name, { durable: true });

      const state: AppState = {
        channel,
        connection,
        consumerTag: null,
        isShuttingDown: false,
        inFlightMessages: 0,
      };

      const wrappedHandler = withMessageHandling<Context>(
        handler,
        logger,
        state,
        context,
      );

      return {
        queue: name,
        state,
        handler: wrappedHandler,
      };
    }),
  );

  const run = createRun(consumers, logger);
  const stop = createStop(connection, consumers, logger);

  return { run, stop };
};
