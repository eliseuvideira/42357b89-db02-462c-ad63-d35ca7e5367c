import type { Redis } from "ioredis";
import type { Logger } from "../types/Logger";
import type { Reply } from "../types/Reply";

export const sendReply = async (
  redisClient: Redis,
  replyTo: string,
  reply: Reply,
  logger: Logger,
): Promise<void> => {
  await redisClient.set(replyTo, JSON.stringify(reply), "EX", 300);
  logger.debug("Reply sent", { replyTo, status: reply.status });
};
