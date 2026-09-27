import type { BrokerConnector, BrokerSession, OrderRequest, OrderResult, Position, AccountBalance } from "./types";

const STARTING_CASH = 100_000;

/**
 * Simulated broker — no external calls, instant "fills" at the submitted
 * price (or a flat mock price for market orders). This is a real feature
 * (lets users try a strategy without connecting a real account) and also
 * the connector every other one is validated against, since it implements
 * the exact same interface with none of the external-API complexity.
 */
export const paperConnector: BrokerConnector = {
  id: "paper",
  displayName: "Paper Trading (Demo)",

  capabilities() {
    return {
      orderTypes: ["MARKET", "LIMIT"],
      assetClasses: ["Equities"],
      supportsFractionalShares: false,
    };
  },

  async connectDirect() {
    return {
      session: { cash: STARTING_CASH },
      brokerUserId: "paper-demo",
    };
  },

  async getAccountBalance(session: BrokerSession): Promise<AccountBalance> {
    const cash = typeof session.cash === "number" ? session.cash : STARTING_CASH;
    return { available: cash, used: 0, currency: "USD" };
  },

  async getPositions(_session: BrokerSession): Promise<Position[]> {
    // Phase 3 scope: connector proves connectivity. Simulated positions are
    // tracked once the execution engine (Phase 4) actually places orders
    // through this connector and records fills.
    return [];
  },

  async getQuote(_session: BrokerSession, symbol: string): Promise<number> {
    // Deterministic-but-varying synthetic price so repeated evaluations of
    // the same symbol don't always see the exact same number.
    const seed = symbol.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const base = 100 + (seed % 400);
    const wobble = Math.sin(Date.now() / 60_000 + seed) * (base * 0.01);
    return Math.round((base + wobble) * 100) / 100;
  },

  async placeOrder(_session: BrokerSession, order: OrderRequest): Promise<OrderResult> {
    return {
      brokerOrderId: `paper-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      status: `simulated_fill:${order.side}:${order.quantity}@${order.price ?? "market"}`,
    };
  },

  async cancelOrder(): Promise<void> {
    // Simulated orders fill instantly, so there's nothing to cancel.
  },
};
