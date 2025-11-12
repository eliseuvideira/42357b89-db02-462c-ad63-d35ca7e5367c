import { connect, AckPolicy, type NatsConnection } from "nats";
import type { Logger } from "./types/Logger";
import { createRun } from "./functions/create-run";
import { createStop } from "./functions/create-stop";
import { withMessageHandling } from "./functions/with-message-handling";
import type { App } from "./types/App";
import type { AppState } from "./types/AppState";
import type { MessageHandler } from "./types/MessageHandler";

export type Consumer = {
  subject: string;
  state: AppState;
};

export type NATSAppQueue<Context extends { logger: Logger }> = {
  stream: string;
  consumer: string;
  subject: string;
  handler: MessageHandler<Context>;
};

export type NATSAppParams<Context extends { logger: Logger }> = {
  servers: string[];
  queues: NATSAppQueue<Context>[];
  context: Context;
};

export const NATSApp = async <Context extends { logger: Logger }>(
  params: NATSAppParams<Context>,
): Promise<App> => {
  const { servers, queues, context } = params;
  const logger = context.logger;

  const nc = await connect({ servers });
  const js = nc.jetstream();

  const consumers: Consumer[] = await Promise.all(
    queues.map(async ({ stream, consumer, subject, handler }) => {
      const sub = await js.subscribe(subject, {
        stream,
        config: {
          durable_name: consumer,
          ack_policy: AckPolicy.Explicit,
        },
      });

      const state: AppState = {
        js,
        subscription: sub,
        isShuttingDown: false,
        inFlightMessages: 0,
      };

      const wrappedHandler = withMessageHandling<Context>(
        handler,
        logger,
        state,
        context,
      );

      (async () => {
        for await (const msg of sub) {
          await wrappedHandler(msg);
        }
      })();

      return {
        subject,
        state,
      };
    }),
  );

  const run = createRun(consumers, logger);
  const stop = createStop(nc, consumers, logger);

  return { run, stop };
};
