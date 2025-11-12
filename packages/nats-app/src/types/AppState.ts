import type { JetStreamClient, JetStreamSubscription } from "nats";

export type AppState = {
  js: JetStreamClient;
  subscription: JetStreamSubscription;
  isShuttingDown: boolean;
  inFlightMessages: number;
};
