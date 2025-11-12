import type { Consumer, ConsumerMessages, JetStreamClient } from "nats";

export type AppState = {
  js: JetStreamClient;
  consumer: Consumer;
  messages: ConsumerMessages;
  isShuttingDown: boolean;
  inFlightMessages: number;
};
