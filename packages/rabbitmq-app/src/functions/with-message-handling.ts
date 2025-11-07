import { randomUUID } from "node:crypto";
import type { Message } from "amqplib";
import type { Logger } from "../types/Logger";
import type { AppState } from "../types/AppState";
import type { MessageHandler } from "../types/MessageHandler";
import type { ReplyError, ReplySuccess } from "../types/Reply";

export const withMessageHandling = <Context extends { logger: Logger }>(
  handler: MessageHandler<Context>,
  rootLogger: Logger,
  state: AppState,
  context: Context,
) => {
  return async (message: Message | null) => {
    if (!message) {
      return;
    }

    if (state.isShuttingDown) {
      rootLogger.debug("Shutting down, requeuing message");
      state.channel.nack(message, false, true);
      return;
    }

    state.inFlightMessages++;

    const correlationId = message.properties.correlationId || randomUUID();
    const logger = rootLogger.child({ correlationId });

    try {
      const content = JSON.parse(message.content.toString());

      logger.debug("Received message", { content });

      const ctx = { ...context, logger };

      const result = await handler(content, ctx);

      if (message.properties.replyTo) {
        const reply: ReplySuccess = {
          status: "success",
          data: result,
          timestamp: new Date().toISOString(),
        };

        logger.debug("Sending reply", { replyTo: message.properties.replyTo });
        state.channel.sendToQueue(
          message.properties.replyTo,
          Buffer.from(JSON.stringify(reply)),
          {
            correlationId: message.properties.correlationId,
          },
        );
      }

      state.channel.ack(message);
      logger.debug("Message processed and acked");
    } catch (error) {
      logger.debug("Error processing message", { error });

      if (message.properties.replyTo) {
        const reply: ReplyError = {
          status: "error",
          error: {
            message: error instanceof Error ? error.message : String(error),
            details: {
              type: error instanceof Error ? error.constructor.name : "Error",
              stack: error instanceof Error ? error.stack : undefined,
            },
          },
          timestamp: new Date().toISOString(),
        };

        state.channel.sendToQueue(
          message.properties.replyTo,
          Buffer.from(JSON.stringify(reply)),
          {
            correlationId: message.properties.correlationId,
          },
        );
      }

      state.channel.nack(message, false, false);
    } finally {
      state.inFlightMessages--;
    }
  };
};
