import pino from "pino";

type LogLevel = "info" | "warn" | "error" | "fatal" | "debug" | "trace";

type LogFn = (msg: string, data?: Record<string, unknown>) => void;

export type Logger = {
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  fatal: LogFn;
  debug: LogFn;
  trace: LogFn;
  child: (bindings: Record<string, unknown>) => Logger;
};

const createLogFn = (pinoLogger: pino.Logger, level: LogLevel): LogFn => {
  return (msg: string, data?: Record<string, unknown>) => {
    // Something
    const logByLevel = pinoLogger[level];

    if (!data) {
      logByLevel(msg);
      return;
    }

    logByLevel(data, msg);
  };
};

const wrapLogger = (pinoLogger: pino.Logger): Logger => {
  return {
    info: createLogFn(pinoLogger, "info"),
    warn: createLogFn(pinoLogger, "warn"),
    error: createLogFn(pinoLogger, "error"),
    fatal: createLogFn(pinoLogger, "fatal"),
    debug: createLogFn(pinoLogger, "debug"),
    trace: createLogFn(pinoLogger, "trace"),
    child: (bindings: Record<string, unknown>) =>
      wrapLogger(pinoLogger.child(bindings)),
  };
};

const level = (level: unknown): LogLevel => {
  switch (level) {
    case "info":
      return "info";
    case "warn":
      return "warn";
    case "error":
      return "error";
    case "fatal":
      return "fatal";
    case "debug":
      return "debug";
    case "trace":
      return "trace";
    default:
      return "info";
  }
};

export const LoggerBuilder = async (
  env: Record<string, unknown>,
): Promise<Logger> => {
  const pinoLogger = pino({
    serializers: {
      error: pino.stdSerializers.err,
    },
    ...(env.NODE_ENV === "development"
      ? {
          transport: {
            target: "pino-pretty",
          },
        }
      : {}),
    level: level(env.LOG_LEVEL),
  });

  return wrapLogger(pinoLogger);
};
