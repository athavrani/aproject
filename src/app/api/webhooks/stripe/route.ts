import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { recordSubscriptionFromSession, cancelSubscriptionByStripeId } from "@/lib/record-subscription";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const body = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      await recordSubscriptionFromSession(event.data.object);
      break;
    }
    case "customer.subscription.deleted": {
      await cancelSubscriptionByStripeId(event.data.object.id);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
