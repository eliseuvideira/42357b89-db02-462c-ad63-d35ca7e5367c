import { ChangeMessageVisibilityCommand, type SQSClient } from "@aws-sdk/client-sqs";
import type { Logger } from "../types/Logger";

export const requeueMessage = async (
  sqsClient: SQSClient,
  queueUrl: string,
  receiptHandle: string | undefined,
  logger: Logger,
): Promise<void> => {
  await sqsClient.send(
    new ChangeMessageVisibilityCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
      VisibilityTimeout: 0,
    }),
  );
  logger.debug("Message requeued");
};
