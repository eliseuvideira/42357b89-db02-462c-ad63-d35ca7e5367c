import { randomUUID } from "node:crypto";
import {
  CreateQueueCommand,
  SendMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import Redis from "ioredis";
import { SQSApp } from "../src/app-builder";

const setup = async (handler: jest.Mock) => {
  const SQS_ENDPOINT = "http://sqs.us-west-2.localhost.localstack.cloud:4566";
  const REDIS_URL = "redis://127.0.0.1:6379";
  const AWS_REGION = "us-west-2";
  const AWS_ACCESS_KEY_ID = randomUUID();
  const AWS_SECRET_ACCESS_KEY = randomUUID();
  process.env.AWS_ACCESS_KEY_ID = AWS_ACCESS_KEY_ID;
  process.env.AWS_SECRET_ACCESS_KEY = AWS_SECRET_ACCESS_KEY;
  process.env.AWS_REGION = AWS_REGION;
  process.env.AWS_ENDPOINT_URL_SQS = SQS_ENDPOINT;

  const sqs = new SQSClient({
    endpoint: SQS_ENDPOINT,
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });
  const redis = new Redis(REDIS_URL);

  const queue = `queue-${randomUUID()}`;
  const response = await sqs.send(new CreateQueueCommand({ QueueName: queue }));
  const url = response.QueueUrl;

  if (!url) {
    throw new Error("Failed to create queue");
  }

  let resolveHandlerCalled: () => void;
  const handlerCalled = new Promise<void>((resolve) => {
    resolveHandlerCalled = resolve;
  }).then(() => new Promise<void>((resolve) => setTimeout(resolve, 10)));

  const wrappedHandler = jest.fn(async (...args) => {
    try {
      return await handler(...args);
    } finally {
      resolveHandlerCalled();
    }
  });

  const context = {
    logger: {
      debug: jest.fn(),
      child: jest.fn().mockReturnThis(),
    },
  };

  const app = await SQSApp({
    redis: {
      url: REDIS_URL,
    },
    queues: [
      {
        url,
        handler: wrappedHandler,
      },
    ],
    context,
  });

  const run = app.run();

  const cleanup = async () => {
    await app.stop();
    sqs.destroy();
    await redis.quit();
    await run;
  };

  return {
    app,
    handler: wrappedHandler,
    handlerCalled,
    sqs,
    redis,
    queue: {
      name: queue,
      url,
    },
    cleanup,
  };
};

describe("app-builder", () => {
  it("should create and stop app", async () => {
    const handler = jest.fn();
    const { handlerCalled, sqs, queue, cleanup } = await setup(handler);

    try {
      const id = randomUUID();
      const body = {
        id,
      };

      await sqs.send(
        new SendMessageCommand({
          QueueUrl: queue.url,
          MessageBody: JSON.stringify(body),
        }),
      );

      await handlerCalled;

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        body,
        expect.objectContaining({
          logger: expect.any(Object),
        }),
      );
    } finally {
      await cleanup();
    }
  });

  it("should send reply to redis", async () => {
    const handlerResult = { success: true, processed: "test" };
    const handler = jest.fn().mockResolvedValue(handlerResult);
    const { handlerCalled, sqs, redis, queue, cleanup } = await setup(handler);

    try {
      const replyKey = `reply:${randomUUID()}`;
      const messageBody = { action: "process", data: "test" };

      await sqs.send(
        new SendMessageCommand({
          QueueUrl: queue.url,
          MessageBody: JSON.stringify(messageBody),
          MessageAttributes: {
            replyTo: {
              DataType: "String",
              StringValue: replyKey,
            },
            correlationId: {
              DataType: "String",
              StringValue: randomUUID(),
            },
          },
        }),
      );

      await handlerCalled;

      const replyData = await redis.get(replyKey);
      expect(replyData).toBeTruthy();

      if (replyData) {
        const reply = JSON.parse(replyData);
        expect(reply).toMatchObject({
          status: "success",
          data: handlerResult,
          correlationId: expect.any(String),
          timestamp: expect.any(String),
        });
      }
    } finally {
      await cleanup();
    }
  });

  it("should send error reply to redis", async () => {
    const errorMessage = "Something went wrong";
    const handler = jest.fn().mockRejectedValue(new Error(errorMessage));
    const { handlerCalled, sqs, redis, queue, cleanup } = await setup(handler);

    try {
      const replyKey = `reply:${randomUUID()}`;
      const messageBody = { action: "fail", data: "test" };

      await sqs.send(
        new SendMessageCommand({
          QueueUrl: queue.url,
          MessageBody: JSON.stringify(messageBody),
          MessageAttributes: {
            replyTo: {
              DataType: "String",
              StringValue: replyKey,
            },
            correlationId: {
              DataType: "String",
              StringValue: randomUUID(),
            },
          },
        }),
      );

      await handlerCalled;

      const replyData = await redis.get(replyKey);
      expect(replyData).toBeTruthy();

      if (replyData) {
        const reply = JSON.parse(replyData);
        expect(reply).toMatchObject({
          status: "error",
          error: {
            message: errorMessage,
          },
          correlationId: expect.any(String),
          timestamp: expect.any(String),
        });
      }
    } finally {
      await cleanup();
    }
  });
});
