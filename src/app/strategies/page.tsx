import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import Nav from "@/components/nav";
import StrategyGrid from "./strategy-grid";

export const dynamic = "force-dynamic";

export default async function StrategiesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const strategies = await db.query.strategies.findMany({
    orderBy: (s, { asc }) => [asc(s.name)],
  });

  const mySubscriptions = await db.query.subscriptions.findMany({
    where: and(eq(subscriptions.userId, user.id), eq(subscriptions.status, "active")),
  });
  const subscribedStrategyIds = new Set(mySubscriptions.map((s) => s.strategyId));

  return (
    <div className="w-full min-h-screen">
      <Nav active="strategies" userEmail={user.email} />

      <main className="max-w-6xl mx-auto p-10 flex flex-col gap-6">
        <div>
          <h1 className="font-display font-semibold text-3xl">Strategies</h1>
          <p className="text-text-secondary text-sm mt-1">
            Browse and subscribe to algorithmic trading strategies
          </p>
        </div>
        <StrategyGrid strategies={strategies} subscribedStrategyIds={[...subscribedStrategyIds]} />
      </main>
    </div>
  );
}
