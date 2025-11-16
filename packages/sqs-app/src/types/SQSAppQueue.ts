import type { Logger } from "./Logger";
import type { MessageHandler } from "./MessageHandler";

export type SQSAppQueue<Context extends { logger: Logger }> = {
  url: string;
  handler: MessageHandler<Context>;
  polling?: {
    batchSize?: number;
    waitTimeSeconds?: number;
  };
};
