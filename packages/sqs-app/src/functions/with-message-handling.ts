import { randomUUID } from "node:crypto";
import {
  DeleteMessageCommand,
  ChangeMessageVisibilityCommand,
  type Message,
} from "@aws-sdk/client-sqs";
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
  return async (message: Message) => {
    if (state.isShuttingDown) {
      rootLogger.debug("Shutting down, requeuing message");
      await state.sqsClient.send(
        new ChangeMessageVisibilityCommand({
          QueueUrl: state.queueUrl,
          ReceiptHandle: message.ReceiptHandle,
          VisibilityTimeout: 0,
        }),
      );
      return;
    }

    state.inFlightMessages++;

    const correlationId =
      message.MessageAttributes?.correlationId?.StringValue || randomUUID();
    const logger = rootLogger.child({ correlationId });

    try {
      const content = JSON.parse(message.Body || "{}");

      logger.debug("Received message", { content });

      const ctx = { ...context, logger };

      const result = await handler(content, ctx);

      const replyTo = message.MessageAttributes?.replyTo?.StringValue;
      if (replyTo) {
        const reply: ReplySuccess = {
          status: "success",
          data: result,
          timestamp: new Date().toISOString(),
        };

        logger.debug("Sending reply to Redis", { replyTo });
        await state.redisClient.set(
          `reply:${correlationId}`,
          JSON.stringify(reply),
          "EX",
          300,
        );
      }

      await state.sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: state.queueUrl,
          ReceiptHandle: message.ReceiptHandle,
        }),
      );
      logger.debug("Message processed and deleted");
    } catch (error) {
      logger.debug("Error processing message", { error });

      const replyTo = message.MessageAttributes?.replyTo?.StringValue;
      if (replyTo) {
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

        await state.redisClient.set(
          `reply:${correlationId}`,
          JSON.stringify(reply),
          "EX",
          300,
        );
      }
    } finally {
      state.inFlightMessages--;
    }
  };
};
