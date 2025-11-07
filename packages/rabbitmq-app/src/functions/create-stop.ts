import type { ChannelModel } from "amqplib";
import type { AppState } from "../types/AppState";
import type { Logger } from "../types/Logger";
import { sleep } from "./sleep";

type Consumer = {
  queue: string;
  state: AppState;
};

export const createStop = (
  connection: ChannelModel,
  consumers: Consumer[],
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
        if (state.consumerTag) {
          await state.channel.cancel(state.consumerTag);
        }
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

    await Promise.all(consumers.map(({ state }) => state.channel.close()));

    if (consumers.length > 0) {
      await connection.close();
    }

    logger.debug("App stopped");
  };
};
