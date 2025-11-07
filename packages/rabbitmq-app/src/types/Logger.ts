export type Logger = {
  debug: (message: string, data?: Record<string, unknown>) => void;
  child: (bindings: Record<string, unknown>) => Logger;
};
