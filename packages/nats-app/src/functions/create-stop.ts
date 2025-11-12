import type { NatsConnection } from "nats";
import type { Logger } from "../types/Logger";
import type { AppConsumer } from "../app-builder";
import { sleep } from "./sleep";

export const createStop = (
  nc: NatsConnection,
  consumers: AppConsumer[],
  logger: Logger,
) => {
  let done = false;

  return async () => {
    if (done) {
      return;
    }
    done = true;

    logger.debug("Stopping all consumers");

    await Promise.all(
      consumers.map(async ({ state }) => {
        state.isShuttingDown = true;
        state.messages.close();
      }),
    );
    logger.debug("All consumers cancelled");

    const totalInFlight = consumers.reduce(
      (sum, { state }) => sum + state.inFlightMessages,
      0,
    );
    logger.debug("Waiting for in-flight messages", {
      inFlightMessages: totalInFlight,
    });

    while (consumers.some(({ state }) => state.inFlightMessages > 0)) {
      await sleep(100);
    }
    logger.debug("All in-flight messages completed");

    if (consumers.length > 0) {
      await Promise.all(
        consumers.map(async ({ state }) => {
          await state.messages.close();
        }),
      );
      await nc.drain();
    }

    await nc.close();

    logger.debug("App stopped");
  };
};
