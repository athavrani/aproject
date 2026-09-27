import { redirect, notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { subscriptions, tradingAccounts } from "@/db/schema";
import Nav from "@/components/nav";
import DeployForm from "./deploy-form";

export const dynamic = "force-dynamic";

export default async function DeployPage({
  params,
}: {
  params: Promise<{ subscriptionId: string }>;
}) {
  const { subscriptionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.id, subscriptionId),
      eq(subscriptions.userId, user.id),
      eq(subscriptions.status, "active")
    ),
    with: { strategy: true },
  });
  if (!subscription) notFound();

  const accounts = await db.query.tradingAccounts.findMany({
    where: and(eq(tradingAccounts.userId, user.id), eq(tradingAccounts.status, "connected")),
  });

  return (
    <div className="w-full min-h-screen">
      <Nav active="my-strategies" userEmail={user.email} />
      <main className="max-w-2xl mx-auto p-10 flex flex-col gap-6">
        <a href="/my-strategies" className="text-sm text-text-secondary font-medium w-fit">← Back to My Strategies</a>
        <div>
          <h1 className="font-display font-semibold text-2xl">Deploy {subscription.strategy.name}</h1>
          <p className="text-text-secondary text-sm mt-1">
            Choose a connected trading account and set your risk limits.
          </p>
        </div>

        {accounts.length === 0 ? (
          <div className="flex flex-col items-center text-center gap-4 py-16 px-6 bg-surface border border-dashed border-border rounded-xl">
            <div className="font-semibold text-sm">No trading accounts connected yet</div>
            <a href="/connect-account" className="px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold">
              Connect an account
            </a>
          </div>
        ) : (
          <DeployForm
            subscriptionId={subscription.id}
            accounts={accounts.map((a) => ({ id: a.id, nickname: a.nickname, broker: a.broker }))}
          />
        )}
      </main>
    </div>
  );
}
