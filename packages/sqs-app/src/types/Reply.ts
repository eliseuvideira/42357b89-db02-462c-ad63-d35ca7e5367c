export type Reply<T = unknown> = ReplySuccess<T> | ReplyError;

export type ReplySuccess<T = unknown> = {
  status: "success";
  data: T;
  correlationId: string;
  timestamp: string;
};

export type ReplyError = {
  status: "error";
  error: {
    message: string;
  };
  correlationId: string;
  timestamp: string;
};
