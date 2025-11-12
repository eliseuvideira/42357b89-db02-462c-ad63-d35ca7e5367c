import { connect, AckPolicy, type JsMsg } from "nats";
import type { Logger } from "./types/Logger";
import { createRun } from "./functions/create-run";
import { createStop } from "./functions/create-stop";
import { withMessageHandling } from "./functions/with-message-handling";
import type { App } from "./types/App";
import type { AppState } from "./types/AppState";
import type { MessageHandler } from "./types/MessageHandler";

export type AppConsumer = {
  subject: string;
  state: AppState;
  handler: (msg: JsMsg) => Promise<void>;
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

  const consumers: AppConsumer[] = await Promise.all(
    queues.map(async ({ stream, consumer, subject, handler }) => {
      const jsm = await nc.jetstreamManager();

      await jsm.streams.add({
        name: stream,
        subjects: [subject],
      });
      await jsm.consumers.add(stream, {
        durable_name: consumer,
        ack_policy: AckPolicy.Explicit,
        filter_subject: subject,
      });

      const jsConsumer = await js.consumers.get(stream, consumer);
      const messages = await jsConsumer.consume();

      const state: AppState = {
        js,
        consumer: jsConsumer,
        messages,
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
        subject,
        state,
        handler: wrappedHandler,
      };
    }),
  );

  const run = createRun(consumers, logger);
  const stop = createStop(nc, consumers, logger);

  return { run, stop };
};
