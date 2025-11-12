import type { Logger } from "../types/Logger";
import type { AppConsumer } from "../app-builder";

export const createRun = (consumers: AppConsumer[], logger: Logger) => {
  return async () => {
    consumers.forEach(({ subject }) => {
      logger.debug("Listening on subject", { subject });
    });
  };
};
