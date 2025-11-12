import type { AppConsumer } from "../app-builder";
import type { Logger } from "../types/Logger";

export const createRun = (consumers: AppConsumer[], logger: Logger) => {
  return async () => {
    await Promise.all(
      consumers.map(async ({ subject, state, handler }) => {
        logger.debug("Listening on subject", { subject });

        for await (const msg of state.messages) {
          if (state.isShuttingDown) {
            break;
          }

          handler(msg).catch(() => {});
        }
      }),
    );
  };
};
