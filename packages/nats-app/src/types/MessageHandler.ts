import type { Logger } from "./Logger";

export type MessageHandler<
  Context extends { logger: Logger } = { logger: Logger },
> = (content: unknown, ctx: Context) => Promise<unknown>;
