import { ReceiveMessageCommand } from "@aws-sdk/client-sqs";
import type { Logger } from "../types/Logger";
import type { Consumer } from "../app-builder";

export const createRun = (consumers: Consumer[], logger: Logger) => {
  return async () => {
    await Promise.all(
      consumers.map(async ({ queueUrl, state, handler }) => {
        state.pollingActive = true;
        logger.debug("Starting polling on queue", { queueUrl });

        while (state.pollingActive && !state.isShuttingDown) {
          try {
            const response = await state.sqsClient.send(
              new ReceiveMessageCommand({
                QueueUrl: queueUrl,
                MaxNumberOfMessages: 10,
                WaitTimeSeconds: 20,
                MessageAttributeNames: ["All"],
              }),
            );

            if (response.Messages && response.Messages.length > 0) {
              await Promise.all(
                response.Messages.map((message) => handler(message)),
              );
            }
          } catch (error) {
            if (!state.isShuttingDown) {
              logger.debug("Error polling queue", { error, queueUrl });
            }
          }
        }

        logger.debug("Stopped polling on queue", { queueUrl });
      }),
    );
  };
};
