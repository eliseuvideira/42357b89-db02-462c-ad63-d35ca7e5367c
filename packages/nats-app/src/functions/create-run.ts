import type { Logger } from "../types/Logger";
import type { Consumer } from "../app-builder";

export const createRun = (consumers: Consumer[], logger: Logger) => {
  return async () => {
    consumers.forEach(({ subject }) => {
      logger.debug("Listening on subject", { subject });
    });
  };
};
