import type { ReplySuccess } from "../types/Reply";

export const createSuccessReply = (
  data: unknown,
  correlationId: string,
): ReplySuccess => {
  return {
    status: "success",
    data,
    correlationId,
    timestamp: new Date().toISOString(),
  };
};
