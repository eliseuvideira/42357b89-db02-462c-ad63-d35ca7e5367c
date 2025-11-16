import type { SQSClient } from "@aws-sdk/client-sqs";
import type { Redis } from "ioredis";

export type AppState = {
  sqsClient: SQSClient;
  redisClient: Redis;
  abortController: AbortController;
  queue: {
    url: string;
  };
  isShuttingDown: boolean;
  pollingActive: boolean;
  inFlightMessages: number;
};
