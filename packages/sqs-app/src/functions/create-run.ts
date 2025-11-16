import { ReceiveMessageCommand } from "@aws-sdk/client-sqs";
import type { Logger } from "../types/Logger";
import type { Consumer } from "../types/Consumer";

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
              logger.debug("Error polling queue", {
                error,
                queueUrl: queue.url,
              });
            }
          }
        }

        logger.debug("Stopped polling on queue", { queueUrl: queue.url });
      }),
    );
  };
};
