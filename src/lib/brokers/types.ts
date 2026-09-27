/**
 * The broker-agnostic contract. Every broker (paper, Zerodha, and any future
 * one) implements this same interface — the rest of the app never branches
 * on which broker it's talking to. See ../../../README.md for the full
 * rationale.
 */

export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT";

export interface OrderRequest {
  symbol: string;
  exchange: string; // e.g. "NSE" — broker-specific, but every broker takes one
  side: OrderSide;
  quantity: number;
  orderType: OrderType;
  price?: number; // required for LIMIT orders
}

export interface OrderResult {
  brokerOrderId: string;
  status: string; // broker's own status string, not normalized (yet)
}

export interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  pnl: number;
}

export interface AccountBalance {
  available: number;
  used: number;
  currency: string;
}

export interface BrokerCapabilities {
  orderTypes: OrderType[];
  assetClasses: string[];
  supportsFractionalShares: boolean;
}

/** Opaque, broker-specific session data — decrypted from trading_accounts.encryptedCredentials. */
export type BrokerSession = Record<string, unknown>;

export interface BrokerConnector {
  id: string;
  displayName: string;
  capabilities(): BrokerCapabilities;

  /** For redirect-based auth brokers (Zerodha). Undefined for direct-connect brokers (paper). */
  getLoginUrl?(): string;

  /** Exchanges a login callback's query params for a storable session. */
  exchangeLoginCallback?(params: Record<string, string>): Promise<{
    session: BrokerSession;
    brokerUserId: string;
    expiresAt: Date | null;
  }>;

  /** For direct-connect brokers (paper). Returns a session with no external round-trip. */
  connectDirect?(): Promise<{ session: BrokerSession; brokerUserId: string }>;

  getAccountBalance(session: BrokerSession): Promise<AccountBalance>;
  getPositions(session: BrokerSession): Promise<Position[]>;
  placeOrder(session: BrokerSession, order: OrderRequest): Promise<OrderResult>;
  cancelOrder(session: BrokerSession, brokerOrderId: string): Promise<void>;
}
