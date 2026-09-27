import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import Nav from "@/components/nav";

export const dynamic = "force-dynamic";

const RISK_STYLES: Record<string, string> = {
  low: "bg-[#E3F3EA] text-[#16794F]",
  medium: "bg-[#FBF0DD] text-[#A15C00]",
  high: "bg-[#FDE7E5] text-[#B42318]",
};

export default async function MyStrategiesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mySubscriptions = await db.query.subscriptions.findMany({
    where: and(eq(subscriptions.userId, user.id), eq(subscriptions.status, "active")),
    with: { strategy: true },
    orderBy: (s, { desc }) => [desc(s.subscribedAt)],
  });

  return (
    <div className="w-full min-h-screen">
      <Nav active="my-strategies" userEmail={user.email} />

      <main className="max-w-6xl mx-auto p-10 flex flex-col gap-6">
        <div>
          <h1 className="font-display font-semibold text-3xl">My Strategies</h1>
          <p className="text-text-secondary text-sm mt-1">
            Manage your subscribed strategies and deployments
          </p>
        </div>

        {mySubscriptions.length === 0 ? (
          <div className="flex flex-col items-center text-center gap-4 py-20 px-6 bg-surface border border-dashed border-border rounded-xl">
            <div className="font-display font-semibold text-xl">You haven&apos;t subscribed to any strategies yet</div>
            <p className="text-sm text-text-secondary max-w-md">
              Browse the strategy marketplace and subscribe to one to see it here.
            </p>
            <a href="/strategies" className="px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold">
              Browse Strategies
            </a>
          </div>
        ) : (
          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            {mySubscriptions.map((sub) => (
              <div key={sub.id} className="bg-surface border border-border rounded-xl p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="font-display font-semibold text-lg">{sub.strategy.name}</div>
                    <div className="text-sm text-text-secondary">{sub.strategy.category} · {sub.strategy.assetClass}</div>
                  </div>
                  <div className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${RISK_STYLES[sub.strategy.riskLevel]}`}>
                    Not deployed
                  </div>
                </div>
                <div className="flex gap-6 py-3 border-y border-border">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-text-secondary">Subscribed</div>
                    <div className="text-sm font-semibold">
                      {sub.subscribedAt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-text-secondary">Price</div>
                    <div className="text-sm font-semibold">${(sub.strategy.priceCents / 100).toFixed(0)}/{sub.strategy.billingCycle === "monthly" ? "mo" : sub.strategy.billingCycle}</div>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <a
                    href={`/strategies/${sub.strategy.slug}`}
                    className="flex-1 text-center py-2.5 rounded-lg border border-accent text-accent font-semibold text-sm"
                  >
                    View Details
                  </a>
                  <a
                    href={`/deploy/${sub.id}`}
                    className="flex-1 text-center py-2.5 rounded-lg bg-accent text-white font-semibold text-sm"
                  >
                    Deploy
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
