import type { Message } from "@aws-sdk/client-sqs";
import type { AppState } from "./AppState";

export type Consumer = {
  queue: {
    url: string;
    polling: {
      batchSize: number;
      waitTimeSeconds: number;
    };
  };
  state: AppState;
  handler: (message: Message) => Promise<void>;
};
