import { ReceiveMessageCommand } from "@aws-sdk/client-sqs";
import type { Logger } from "../types/Logger";
import type { Consumer } from "../types/Consumer";
import { sleep } from "./sleep";

type CreateRunParams = {
  consumers: Consumer[];
  logger: Logger;
};

export const createRun = ({ consumers, logger }: CreateRunParams) => {
  return async () => {
    await Promise.all(
      consumers.map(async ({ queue, state, handler }) => {
        state.pollingActive = true;
        logger.debug("Starting polling on queue", { queueUrl: queue.url });

        let consecutiveErrors = 0;
        const maxConsecutiveErrors = 5;

        while (state.pollingActive && !state.isShuttingDown) {
          try {
            const response = await state.sqsClient.send(
              new ReceiveMessageCommand({
                QueueUrl: queue.url,
                MaxNumberOfMessages: queue.polling.batchSize,
                WaitTimeSeconds: queue.polling.waitTimeSeconds,
                MessageAttributeNames: ["All"],
              }),
              {
                abortSignal: state.abortController.signal,
              },
            );

            consecutiveErrors = 0;

            if (response.Messages && response.Messages.length > 0) {
              logger.debug("Received messages", {
                count: response.Messages.length,
                queueUrl: queue.url,
              });
              await Promise.all(
                response.Messages.map((message) => handler(message)),
              );
            }
          } catch (error) {
            if (!state.isShuttingDown) {
              consecutiveErrors++;
              logger.debug("Error polling queue", {
                error,
                queueUrl: queue.url,
                consecutiveErrors,
              });

              if (consecutiveErrors >= maxConsecutiveErrors) {
                logger.debug("Max consecutive errors reached, stopping", {
                  queueUrl: queue.url,
                });
                throw error;
              }

              const backoffMs = Math.min(
                1000 * 2 ** (consecutiveErrors - 1),
                30000,
              );
              logger.debug("Backing off before retry", {
                queueUrl: queue.url,
                backoffMs,
              });
              await sleep(backoffMs);
            }
          }
        }

        logger.debug("Stopped polling on queue", { queueUrl: queue.url });
      }),
    );
  };
};
