import amqplib from "amqplib";
import type { Message } from "amqplib";
import type { Logger } from "./types/Logger";
import type { Config } from "./types/Config";
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

export const AppBuilder = <Context extends { logger: Logger }>(
  define: (config: Config) => Array<{
    queue: string;
    handler: MessageHandler<Context>;
  }>,
) => {
  return {
    async build(config: Config, logger: Logger): Promise<App> {
      const definitions = define(config);

      const connection = await amqplib.connect(config.RABBITMQ_URL);

      const consumers: Consumer[] = await Promise.all(
        definitions.map(async ({ queue, handler }) => {
          const channel = await connection.createChannel();
          await channel.assertQueue(queue, { durable: true });

          const state: AppState = {
            channel,
            connection,
            consumerTag: null,
            isShuttingDown: false,
            inFlightMessages: 0,
          };

          const wrappedHandler = withMessageHandling(handler, logger, state);

          return {
            queue,
            state,
            handler: wrappedHandler,
          };
        }),
      );

      const run = createRun(consumers, logger);
      const stop = createStop(connection, consumers, logger);

      return { run, stop };
    },
  };
};
