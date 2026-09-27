import { eq } from "drizzle-orm";
import { db } from "@/db";
import { deployments, orders } from "@/db/schema";
import { getConnector } from "@/lib/brokers/registry";
import { decryptJson } from "@/lib/crypto";
import type { BrokerSession } from "@/lib/brokers/types";

/**
 * Phase 4 execution engine — first cut.
 *
 * IMPORTANT: the "signal" below is deliberately trivial and clearly
 * illustrative, not a validated trading algorithm. It exists to prove the
 * full pipeline (evaluate -> place order -> record -> enforce risk limit)
 * actually works end to end against a real broker connector, for BOTH the
 * paper connector and a real one (Zerodha) if the user explicitly chose a
 * real account when deploying. It intentionally:
 *   - trades a single fixed demo symbol (INFY on NSE) regardless of the
 *     strategy's stated category/universe — building real per-asset-class
 *     execution (options chains, FX, futures) is out of scope here
 *   - places at most one order per deployment per calendar day
 *   - sizes the order to the user's own configured capital allocation
 */
const DEMO_SYMBOL = "INFY";
const DEMO_EXCHANGE = "NSE";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function evaluateDeployment(deploymentId: string) {
  const deployment = await db.query.deployments.findFirst({
    where: eq(deployments.id, deploymentId),
    with: { tradingAccount: true, orders: true },
  });
  if (!deployment) throw new Error(`Deployment ${deploymentId} not found`);
  if (deployment.status !== "active") return { skipped: "not active" };

  const account = deployment.tradingAccount;
  if (account.status !== "connected" || !account.encryptedCredentials) {
    return { skipped: "trading account not connected" };
  }

  const connector = getConnector(account.broker);
  const session = decryptJson<BrokerSession>(account.encryptedCredentials);

  // Reset the daily P&L counter on a new day, and refresh it from live
  // broker positions where the connector actually reports P&L (Zerodha
  // does; the paper connector's positions are still a stub — see paper.ts).
  const today = todayKey();
  let realizedPnlToday = deployment.pnlDate === today ? Number(deployment.realizedPnlToday) : 0;
  try {
    const positions = await connector.getPositions(session);
    if (positions.length > 0) {
      realizedPnlToday = positions.reduce((sum, p) => sum + p.pnl, 0);
    }
  } catch (err) {
    console.error(`getPositions failed for deployment ${deploymentId}:`, err);
  }

  const maxDailyLoss = Number(deployment.maxDailyLoss);
  if (realizedPnlToday <= -maxDailyLoss) {
    await db
      .update(deployments)
      .set({
        status: "paused",
        pausedReason: `Daily loss limit reached (${realizedPnlToday.toFixed(2)} <= -${maxDailyLoss.toFixed(2)})`,
        realizedPnlToday: String(realizedPnlToday),
        pnlDate: today,
        lastEvaluatedAt: new Date(),
      })
      .where(eq(deployments.id, deploymentId));
    return { paused: "daily_loss_limit" };
  }

  const ordersToday = deployment.orders.filter(
    (o) => o.placedAt.toISOString().slice(0, 10) === today
  );

  if (ordersToday.length > 0) {
    await db
      .update(deployments)
      .set({ realizedPnlToday: String(realizedPnlToday), pnlDate: today, lastEvaluatedAt: new Date() })
      .where(eq(deployments.id, deploymentId));
    return { skipped: "already traded today" };
  }

  const price = await connector.getQuote(session, DEMO_SYMBOL, DEMO_EXCHANGE);
  const capital = Number(deployment.capitalAllocation);
  const quantity = Math.floor(capital / price);

  if (quantity < 1) {
    await db
      .update(deployments)
      .set({ realizedPnlToday: String(realizedPnlToday), pnlDate: today, lastEvaluatedAt: new Date() })
      .where(eq(deployments.id, deploymentId));
    return { skipped: "capital allocation too small for 1 share at current price" };
  }

  const result = await connector.placeOrder(session, {
    symbol: DEMO_SYMBOL,
    exchange: DEMO_EXCHANGE,
    side: "BUY",
    quantity,
    orderType: "MARKET",
  });

  await db.insert(orders).values({
    deploymentId,
    brokerOrderId: result.brokerOrderId,
    symbol: DEMO_SYMBOL,
    side: "BUY",
    quantity,
    price: String(price),
  });

  await db
    .update(deployments)
    .set({ realizedPnlToday: String(realizedPnlToday), pnlDate: today, lastEvaluatedAt: new Date() })
    .where(eq(deployments.id, deploymentId));

  return { placed: result };
}

export async function evaluateAllActiveDeployments() {
  const active = await db.query.deployments.findMany({ where: eq(deployments.status, "active") });
  const results: Record<string, unknown> = {};
  for (const d of active) {
    try {
      results[d.id] = await evaluateDeployment(d.id);
    } catch (err) {
      results[d.id] = { error: err instanceof Error ? err.message : String(err) };
    }
  }
  return results;
}
