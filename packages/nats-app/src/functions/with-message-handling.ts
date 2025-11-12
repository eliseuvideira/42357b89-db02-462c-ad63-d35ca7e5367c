import { randomUUID } from "node:crypto";
import { StringCodec, headers, type JsMsg } from "nats";
import type { Logger } from "../types/Logger";
import type { AppState } from "../types/AppState";
import type { MessageHandler } from "../types/MessageHandler";
import type { ReplyError, ReplySuccess } from "../types/Reply";

const sc = StringCodec();

export const withMessageHandling = <Context extends { logger: Logger }>(
  handler: MessageHandler<Context>,
  rootLogger: Logger,
  state: AppState,
  context: Context,
) => {
  return async (msg: JsMsg) => {
    if (state.isShuttingDown) {
      rootLogger.debug("Shutting down, requeuing message");
      msg.nak();
      return;
    }

    state.inFlightMessages++;

    const correlationId =
      msg.headers?.get("correlation-id") || randomUUID();
    const logger = rootLogger.child({ correlationId });

    try {
      const content = JSON.parse(sc.decode(msg.data));

      logger.debug("Received message", { content });

      const ctx = { ...context, logger };

      const result = await handler(content, ctx);

      const replyTo = msg.headers?.get("reply-to");
      if (replyTo) {
        const reply: ReplySuccess = {
          status: "success",
          data: result,
          timestamp: new Date().toISOString(),
        };

        logger.debug("Sending reply", { replyTo });
        const h = headers();
        h.set("correlation-id", correlationId);
        await state.js.publish(replyTo, sc.encode(JSON.stringify(reply)), {
          headers: h,
        });
      }

      msg.ack();
      logger.debug("Message processed and acked");
    } catch (error) {
      logger.debug("Error processing message", { error });

      const replyTo = msg.headers?.get("reply-to");
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

        const h = headers();
        h.set("correlation-id", correlationId);
        await state.js.publish(replyTo, sc.encode(JSON.stringify(reply)), {
          headers: h,
        });
      }

      msg.term();
    } finally {
      state.inFlightMessages--;
    }
  };
};
