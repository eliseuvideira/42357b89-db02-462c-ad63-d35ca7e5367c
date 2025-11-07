import type { Message } from "amqplib";
import type { Logger } from "../types/Logger";
import type { AppState } from "../types/AppState";

type Consumer = {
  queue: string;
  state: AppState;
  handler: (message: Message | null) => Promise<void>;
};

export const createRun = (consumers: Consumer[], logger: Logger) => {
  return async () => {
    await Promise.all(
      consumers.map(async ({ queue, state, handler }) => {
        const consumeResult = await state.channel.consume(queue, handler);
        state.consumerTag = consumeResult.consumerTag;
        logger.debug("Listening on queue", { queue });
      }),
    );
  };
};
