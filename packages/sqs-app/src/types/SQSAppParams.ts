import type { Logger } from "./Logger";
import type { SQSAppQueue } from "./SQSAppQueue";

export type SQSAppParams<Context extends { logger: Logger }> = {
  sqs: {
    endpoint: string;
  };
  redis: {
    url: string;
  };
  queues: SQSAppQueue<Context>[];
  context: Context;
};
