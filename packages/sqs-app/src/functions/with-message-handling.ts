import type { Message } from "@aws-sdk/client-sqs";
import type { Logger } from "../types/Logger";
import type { AppState } from "../types/AppState";
import type { MessageHandler } from "../types/MessageHandler";
import { parseMessageAttributes } from "./parse-message-attributes";
import { createSuccessReply } from "./create-success-reply";
import { createErrorReply } from "./create-error-reply";
import { sendReply } from "./send-reply";
import { requeueMessage } from "./requeue-message";
import { deleteMessage } from "./delete-message";

type WithMessageHandlingParams<Context extends { logger: Logger }> = {
  handler: MessageHandler<Context>;
  state: AppState;
  context: Context;
};

export const withMessageHandling = <Context extends { logger: Logger }>({
  handler,
  state,
  context,
}: WithMessageHandlingParams<Context>) => {
  return async (message: Message) => {
    if (state.isShuttingDown) {
      context.logger.debug("Shutting down, requeuing message");
      await requeueMessage(
        state.sqsClient,
        state.queue.url,
        message.ReceiptHandle,
        context.logger,
      );
      return;
    }

    state.inFlightMessages++;

    const { correlationId, replyTo } = parseMessageAttributes(message);
    const logger = context.logger.child({ correlationId });

    try {
      let content: unknown;
      try {
        content = JSON.parse(message.Body || "{}");
      } catch (parseError) {
        logger.debug("Failed to parse message body", { error: parseError });
        content = {};
      }

      logger.debug("Received message", { content });

      const ctx = { ...context, logger };

      const result = await handler(content, ctx);

      if (replyTo) {
        const reply = createSuccessReply(result, correlationId);
        await sendReply(state.redisClient, replyTo, reply, logger);
      }
    } catch (error) {
      logger.debug("Error processing message", { error });

      if (replyTo) {
        const reply = createErrorReply(error, correlationId);
        await sendReply(state.redisClient, replyTo, reply, logger);
      }
    } finally {
      await deleteMessage(
        state.sqsClient,
        state.queue.url,
        message.ReceiptHandle,
        logger,
      ).catch((error) => {
        logger.debug("Failed to delete message", {
          error,
        });
      });

      state.inFlightMessages--;
    }
  };
};
