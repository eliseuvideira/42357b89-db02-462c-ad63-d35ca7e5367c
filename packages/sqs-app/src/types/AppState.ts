import type { SQSClient } from "@aws-sdk/client-sqs";
import type { NodeHttpHandler } from "@smithy/node-http-handler";
import type { Redis } from "ioredis";

export type AppState = {
  sqsClient: SQSClient;
  redisClient: Redis;
  requestHandler: NodeHttpHandler;
  queueUrl: string;
  isShuttingDown: boolean;
  pollingActive: boolean;
  inFlightMessages: number;
};
