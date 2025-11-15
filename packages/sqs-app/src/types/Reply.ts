export type Reply<T = unknown> = ReplySuccess<T> | ReplyError;

export type ReplySuccess<T = unknown> = {
  status: "success";
  data: T;
  timestamp: string;
};

export type ReplyError = {
  status: "error";
  error: {
    message: string;
    details: Record<string, unknown>;
  };
  timestamp: string;
};
