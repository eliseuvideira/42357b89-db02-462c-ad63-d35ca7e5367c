import type { ReplyError } from "../types/Reply";

export const createErrorReply = (
  error: unknown,
  correlationId: string,
): ReplyError => {
  return {
    status: "error",
    error: {
      message: error instanceof Error ? error.message : String(error),
    },
    correlationId,
    timestamp: new Date().toISOString(),
  };
};
