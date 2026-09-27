import crypto from "crypto";
import type {
  BrokerConnector,
  BrokerSession,
  OrderRequest,
  OrderResult,
  Position,
  AccountBalance,
} from "./types";

const KITE_BASE_URL = "https://api.kite.trade";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function authHeaders(session: BrokerSession) {
  const apiKey = requireEnv("KITE_API_KEY");
  const accessToken = session.accessToken as string;
  return {
    Authorization: `token ${apiKey}:${accessToken}`,
    "X-Kite-Version": "3",
  };
}

async function kiteRequest<T>(
  path: string,
  init: RequestInit & { session?: BrokerSession } = {}
): Promise<T> {
  const { session, ...rest } = init;
  const res = await fetch(`${KITE_BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(session ? authHeaders(session) : {}),
      ...(rest.headers ?? {}),
    },
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = body?.message ?? `Kite API error (${res.status})`;
    throw new Error(message);
  }
  return body.data as T;
}

export const zerodhaConnector: BrokerConnector = {
  id: "zerodha",
  displayName: "Zerodha Kite",

  capabilities() {
    return {
      orderTypes: ["MARKET", "LIMIT"],
      assetClasses: ["Equities", "Derivatives"],
      supportsFractionalShares: false,
    };
  },

  getLoginUrl() {
    const apiKey = requireEnv("KITE_API_KEY");
    return `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}`;
  },

  async exchangeLoginCallback(params: Record<string, string>) {
    const requestToken = params.request_token;
    if (!requestToken) throw new Error("Missing request_token from Zerodha callback");

    const apiKey = requireEnv("KITE_API_KEY");
    const apiSecret = requireEnv("KITE_API_SECRET");
    const checksum = crypto
      .createHash("sha256")
      .update(apiKey + requestToken + apiSecret)
      .digest("hex");

    const res = await fetch(`${KITE_BASE_URL}/session/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        api_key: apiKey,
        request_token: requestToken,
        checksum,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body?.message ?? "Failed to exchange Zerodha request token");
    }

    const data = body.data;
    // Kite access tokens expire daily at a fixed time (~6 AM IST), not on a
    // rolling TTL — there's no refresh token. Approximate with "tomorrow 6 AM IST".
    const expiresAt = nextKiteExpiry();

    return {
      session: { accessToken: data.access_token as string },
      brokerUserId: data.user_id as string,
      expiresAt,
    };
  },

  async getAccountBalance(session: BrokerSession): Promise<AccountBalance> {
    const margins = await kiteRequest<{ equity: { available: { cash: number }; utilised: { debits: number } } }>(
      "/user/margins",
      { session }
    );
    return {
      available: margins.equity.available.cash,
      used: margins.equity.utilised.debits,
      currency: "INR",
    };
  },

  async getPositions(session: BrokerSession): Promise<Position[]> {
    const positions = await kiteRequest<{
      net: Array<{ tradingsymbol: string; quantity: number; average_price: number; last_price: number; pnl: number }>;
    }>("/portfolio/positions", { session });

    return positions.net.map((p) => ({
      symbol: p.tradingsymbol,
      quantity: p.quantity,
      averagePrice: p.average_price,
      currentPrice: p.last_price,
      pnl: p.pnl,
    }));
  },

  async getQuote(session: BrokerSession, symbol: string, exchange: string): Promise<number> {
    const key = `${exchange}:${symbol}`;
    const quote = await kiteRequest<Record<string, { last_price: number }>>(
      `/quote/ltp?i=${encodeURIComponent(key)}`,
      { session }
    );
    const entry = quote[key];
    if (!entry) throw new Error(`No quote returned for ${key}`);
    return entry.last_price;
  },

  async placeOrder(session: BrokerSession, order: OrderRequest): Promise<OrderResult> {
    const body = new URLSearchParams({
      tradingsymbol: order.symbol,
      exchange: order.exchange,
      transaction_type: order.side,
      order_type: order.orderType,
      quantity: String(order.quantity),
      product: "CNC",
      validity: "DAY",
      ...(order.orderType === "LIMIT" && order.price ? { price: String(order.price) } : {}),
    });

    const result = await kiteRequest<{ order_id: string }>("/orders/regular", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      session,
    });

    return { brokerOrderId: result.order_id, status: "submitted" };
  },

  async cancelOrder(session: BrokerSession, brokerOrderId: string): Promise<void> {
    await kiteRequest(`/orders/regular/${brokerOrderId}`, { method: "DELETE", session });
  },
};

function nextKiteExpiry(): Date {
  const now = new Date();
  const istOffsetMinutes = 5 * 60 + 30;
  const nowIst = new Date(now.getTime() + istOffsetMinutes * 60_000);
  const expiryIst = new Date(nowIst);
  expiryIst.setUTCHours(6, 0, 0, 0);
  if (expiryIst <= nowIst) expiryIst.setUTCDate(expiryIst.getUTCDate() + 1);
  return new Date(expiryIst.getTime() - istOffsetMinutes * 60_000);
}
