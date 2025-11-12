import type {
  Consumer,
  ConsumerMessages,
  JetStreamClient,
  NatsConnection,
} from "nats";

export type AppState = {
  nc: NatsConnection;
  js: JetStreamClient;
  consumer: Consumer;
  messages: ConsumerMessages;
  isShuttingDown: boolean;
  inFlightMessages: number;
};
