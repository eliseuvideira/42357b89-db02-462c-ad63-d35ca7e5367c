import type { Logger } from "./Logger";
import type { SQSAppQueue } from "./SQSAppQueue";

export type SQSAppParams<Context extends { logger: Logger }> = {
  redis: {
    url: string;
  };
  queues: SQSAppQueue<Context>[];
  context: Context;
};
