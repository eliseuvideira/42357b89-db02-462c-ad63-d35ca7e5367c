import type { SQSClient } from "@aws-sdk/client-sqs";
import type { Redis } from "ioredis";

export type AppState = {
  sqsClient: SQSClient;
  redisClient: Redis;
  queueUrl: string;
  isShuttingDown: boolean;
  pollingActive: boolean;
  inFlightMessages: number;
};
