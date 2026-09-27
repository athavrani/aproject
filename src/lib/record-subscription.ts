import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

/**
 * Upserts a `subscriptions` row from a completed Stripe Checkout Session.
 * Idempotent by stripeSubscriptionId, so it's safe to call from both the
 * success-page fallback (immediate, works in local dev without a webhook)
 * and the webhook handler (reliable, works even if the customer closes the
 * tab before hitting the success page).
 */
export async function recordSubscriptionFromSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid" && session.status !== "complete") {
    return null;
  }

  const userId = session.metadata?.userId;
  const strategyId = session.metadata?.strategyId;
  if (!userId || !strategyId) {
    throw new Error("Checkout session is missing userId/strategyId metadata");
  }

  const stripeSubscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!stripeSubscriptionId) {
    throw new Error("Checkout session has no subscription id");
  }

  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId),
  });
  if (existing) return existing;

  const [row] = await db
    .insert(subscriptions)
    .values({
      userId,
      strategyId,
      status: "active",
      stripeSubscriptionId,
      stripeCheckoutSessionId: session.id,
    })
    .returning();

  return row;
}

export async function cancelSubscriptionByStripeId(stripeSubscriptionId: string) {
  await db
    .update(subscriptions)
    .set({ status: "canceled", canceledAt: new Date() })
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
}

export async function getCheckoutSession(sessionId: string) {
  return stripe.checkout.sessions.retrieve(sessionId);
}
