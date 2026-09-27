import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { strategies, profiles } from "@/db/schema";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const formData = await request.formData();
  const strategyId = formData.get("strategyId");
  if (typeof strategyId !== "string") {
    return NextResponse.json({ error: "Missing strategyId" }, { status: 400 });
  }

  const strategy = await db.query.strategies.findFirst({
    where: eq(strategies.id, strategyId),
  });
  if (!strategy || !strategy.stripePriceId) {
    return NextResponse.json({ error: "Strategy not available for purchase" }, { status: 404 });
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });

  let customerId = profile?.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await db.update(profiles).set({ stripeCustomerId: customerId }).where(eq(profiles.id, user.id));
  }

  const origin = request.nextUrl.origin;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: strategy.stripePriceId, quantity: 1 }],
    success_url: `${origin}/purchase-confirmed?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/strategies/${strategy.slug}`,
    metadata: { userId: user.id, strategyId: strategy.id },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Could not create checkout session" }, { status: 500 });
  }

  return NextResponse.redirect(session.url, 303);
}
