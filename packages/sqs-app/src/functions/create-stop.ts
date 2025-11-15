import type { SQSClient } from "@aws-sdk/client-sqs";
import type { NodeHttpHandler } from "@smithy/node-http-handler";
import type { Redis } from "ioredis";
import type { Logger } from "../types/Logger";
import type { Consumer } from "../app-builder";
import { sleep } from "./sleep";

export const createStop = (
  sqsClient: SQSClient,
  redisClient: Redis,
  requestHandler: NodeHttpHandler,
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

    consumers.forEach(({ state }) => {
      state.isShuttingDown = true;
      state.pollingActive = false;
    });
    logger.debug("All consumers stopped");

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

    sqsClient.destroy();
    requestHandler.destroy();
    await redisClient.quit();

    logger.debug("App stopped");
  };
};
