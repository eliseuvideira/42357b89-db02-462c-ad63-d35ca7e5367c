import pino from "pino";
import type { Logger } from "./types";

export type LogFn = (msg: string, data?: Record<string, unknown>) => void;

const wrapLogger = (pinoLogger: pino.Logger): Logger => {
  const createLogFn = (level: pino.Level): LogFn => {
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

  return {
    info: createLogFn("info"),
    warn: createLogFn("warn"),
    error: createLogFn("error"),
    fatal: createLogFn("fatal"),
    debug: createLogFn("debug"),
    trace: createLogFn("trace"),
    child: (bindings: Record<string, unknown>) =>
      wrapLogger(pinoLogger.child(bindings)),
  };
};

const level = (level: unknown): pino.Level => {
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

const build = async (env: Record<string, unknown>): Promise<Logger> => {
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

export const LoggerBuilder = {
  build,
};
