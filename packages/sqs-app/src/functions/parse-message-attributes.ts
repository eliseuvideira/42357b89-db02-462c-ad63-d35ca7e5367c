import { randomUUID } from "node:crypto";
import type { Message } from "@aws-sdk/client-sqs";

type MessageAttributes = {
  correlationId: string;
  replyTo: string | null;
};

export const parseMessageAttributes = (message: Message): MessageAttributes => {
  const correlationId =
    message.MessageAttributes?.correlationId?.StringValue || randomUUID();
  const replyTo = message.MessageAttributes?.replyTo?.StringValue || null;

  return {
    correlationId,
    replyTo,
  };
};
