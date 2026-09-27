import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { subscriptions, tradingAccounts, deployments } from "@/db/schema";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const form = await request.formData();
  const subscriptionId = form.get("subscriptionId");
  const tradingAccountId = form.get("tradingAccountId");
  const capitalAllocation = Number(form.get("capitalAllocation"));
  const maxDailyLoss = Number(form.get("maxDailyLoss"));
  const riskAck = form.get("riskAck");
  const realBrokerAck = form.get("realBrokerAck");

  if (typeof subscriptionId !== "string" || typeof tradingAccountId !== "string") {
    return NextResponse.json({ error: "Missing subscriptionId/tradingAccountId" }, { status: 400 });
  }
  if (!riskAck) {
    return NextResponse.json({ error: "Risk acknowledgment is required" }, { status: 400 });
  }
  if (!Number.isFinite(capitalAllocation) || capitalAllocation <= 0) {
    return NextResponse.json({ error: "Invalid capital allocation" }, { status: 400 });
  }
  if (!Number.isFinite(maxDailyLoss) || maxDailyLoss <= 0) {
    return NextResponse.json({ error: "Invalid max daily loss" }, { status: 400 });
  }

  const subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.id, subscriptionId),
      eq(subscriptions.userId, user.id),
      eq(subscriptions.status, "active")
    ),
  });
  if (!subscription) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  const account = await db.query.tradingAccounts.findFirst({
    where: and(
      eq(tradingAccounts.id, tradingAccountId),
      eq(tradingAccounts.userId, user.id),
      eq(tradingAccounts.status, "connected")
    ),
  });
  if (!account) {
    return NextResponse.json({ error: "Trading account not found or not connected" }, { status: 404 });
  }

  // Server-side enforcement, never trust the client alone for this: a real
  // (non-paper) broker account requires the explicit real-money acknowledgment.
  if (account.broker !== "paper" && !realBrokerAck) {
    return NextResponse.json(
      { error: "Real-broker acknowledgment is required to deploy to this account" },
      { status: 400 }
    );
  }

  await db.insert(deployments).values({
    userId: user.id,
    strategyId: subscription.strategyId,
    tradingAccountId: account.id,
    capitalAllocation: String(capitalAllocation),
    maxDailyLoss: String(maxDailyLoss),
    riskAcknowledgedAt: new Date(),
  });

  return NextResponse.redirect(new URL("/dashboard", request.url), 303);
}
