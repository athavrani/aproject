// One-off script: creates a Stripe Product + recurring Price for every
// strategy that doesn't have one yet, and saves the price/product IDs back
// onto the strategies row. Safe to re-run — skips strategies that already
// have a stripePriceId.
import { db } from "./index";
import { strategies } from "./schema";
import { stripe } from "../lib/stripe";
import { eq, isNull } from "drizzle-orm";

async function run() {
  const pending = await db
    .select()
    .from(strategies)
    .where(isNull(strategies.stripePriceId));

  if (pending.length === 0) {
    console.log("All strategies already have a Stripe price.");
    return;
  }

  for (const strategy of pending) {
    const product = await stripe.products.create({
      name: strategy.name,
      description: strategy.description,
      metadata: { strategyId: strategy.id, slug: strategy.slug },
    });

    const price = await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: strategy.priceCents,
      recurring: { interval: strategy.billingCycle === "monthly" ? "month" : "year" },
    });

    await db
      .update(strategies)
      .set({ stripeProductId: product.id, stripePriceId: price.id })
      .where(eq(strategies.id, strategy.id));

    console.log(`${strategy.name}: product ${product.id}, price ${price.id}`);
  }

  console.log(`Created Stripe prices for ${pending.length} strategies.`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });
