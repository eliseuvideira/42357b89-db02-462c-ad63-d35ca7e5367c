import { DeleteMessageCommand, type SQSClient } from "@aws-sdk/client-sqs";
import type { Logger } from "../types/Logger";

export const deleteMessage = async (
  sqsClient: SQSClient,
  queueUrl: string,
  receiptHandle: string | undefined,
  logger: Logger,
): Promise<void> => {
  await sqsClient.send(
    new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    }),
  );
  logger.debug("Message deleted");
};
