import type { BrokerConnector } from "./types";
import { paperConnector } from "./paper";
import { zerodhaConnector } from "./zerodha";

export const BROKER_REGISTRY: Record<string, BrokerConnector> = {
  paper: paperConnector,
  zerodha: zerodhaConnector,
};

export function getConnector(brokerId: string): BrokerConnector {
  const connector = BROKER_REGISTRY[brokerId];
  if (!connector) throw new Error(`Unknown broker: ${brokerId}`);
  return connector;
}
