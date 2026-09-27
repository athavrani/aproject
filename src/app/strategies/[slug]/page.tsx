import { redirect, notFound } from "next/navigation";
import { eq, and, count } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { strategies, subscriptions } from "@/db/schema";
import Nav from "@/components/nav";
import PerformanceChart from "./performance-chart";

export const dynamic = "force-dynamic";

const RISK_STYLES: Record<string, string> = {
  low: "bg-[#E3F3EA] text-[#16794F]",
  medium: "bg-[#FBF0DD] text-[#A15C00]",
  high: "bg-[#FDE7E5] text-[#B42318]",
};

function statOrDash(value: string | null, suffix = "%") {
  return value === null ? "—" : `${Number(value) >= 0 && suffix === "%" ? "+" : ""}${value}${suffix}`;
}

export default async function StrategyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const strategy = await db.query.strategies.findFirst({
    where: eq(strategies.slug, slug),
  });
  if (!strategy) notFound();

  const [{ subscriberCount }] = await db
    .select({ subscriberCount: count() })
    .from(subscriptions)
    .where(and(eq(subscriptions.strategyId, strategy.id), eq(subscriptions.status, "active")));

  const mySubscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.strategyId, strategy.id),
      eq(subscriptions.userId, user.id),
      eq(subscriptions.status, "active")
    ),
  });

  return (
    <div className="w-full min-h-screen">
      <Nav active="strategies" userEmail={user.email} />

      <main className="max-w-6xl mx-auto p-10 flex flex-col gap-8">
        <a href="/strategies" className="flex items-center gap-1.5 text-text-secondary text-sm font-medium w-fit">
          ← Back to Strategies
        </a>

        <div className="flex items-start justify-between gap-10 flex-wrap">
          <div className="flex flex-col gap-3 max-w-xl">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display font-semibold text-3xl">{strategy.name}</h1>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${RISK_STYLES[strategy.riskLevel]}`}>
                {strategy.riskLevel[0].toUpperCase() + strategy.riskLevel.slice(1)} risk
              </span>
            </div>
            <div className="text-sm text-text-secondary">
              {strategy.category} · {strategy.assetClass} · {subscriberCount} subscriber{subscriberCount === 1 ? "" : "s"}
            </div>
            <p className="text-[15px] leading-relaxed">{strategy.description}</p>
          </div>
          <div className="flex flex-col gap-3 items-end min-w-[220px]">
            <div className="font-display text-2xl font-bold">
              ${(strategy.priceCents / 100).toFixed(0)}
              <span className="text-[15px] font-medium text-text-secondary">/{strategy.billingCycle === "monthly" ? "mo" : strategy.billingCycle}</span>
            </div>
            {mySubscription ? (
              <>
                <div className="bg-[#E3F3EA] text-[#16794F] rounded-lg px-7 py-3 font-semibold text-sm">
                  ✓ Subscribed
                </div>
                <a href="/my-strategies" className="text-xs text-accent font-medium">View in My Strategies</a>
              </>
            ) : strategy.stripePriceId ? (
              <form action="/api/checkout" method="POST">
                <input type="hidden" name="strategyId" value={strategy.id} />
                <button
                  type="submit"
                  className="bg-accent text-white rounded-lg px-7 py-3 font-semibold text-sm cursor-pointer"
                >
                  Buy Strategy
                </button>
                <div className="text-xs text-text-secondary text-right mt-2">Billed {strategy.billingCycle} · Cancel anytime</div>
              </form>
            ) : (
              <>
                <button type="button" disabled className="bg-accent text-white rounded-lg px-7 py-3 font-semibold text-sm opacity-55 cursor-not-allowed">
                  Buy Strategy
                </button>
                <div className="text-xs text-text-secondary text-right">Not yet available for purchase</div>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          <StatTile label="CAGR" value={statOrDash(strategy.cagrSample)} color="#15803D" />
          <StatTile label="Max Drawdown" value={statOrDash(strategy.maxDrawdownSample)} color="#DC2626" />
          <StatTile label="Win Rate" value={statOrDash(strategy.winRateSample)} />
          <StatTile label="Sharpe Ratio" value={statOrDash(strategy.sharpeSample, "")} />
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 flex flex-col gap-4">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <div className="font-display font-semibold text-base">Cumulative performance (sample)</div>
            <div className="text-xs text-text-secondary">Trailing 12 months</div>
          </div>
          <PerformanceChart seed={strategy.slug} endValue={strategy.cagrSample ? Number(strategy.cagrSample) : 0} />
        </div>

        {strategy.howItWorks && strategy.howItWorks.length > 0 && (
          <div className="bg-surface border border-border rounded-xl p-6 flex flex-col gap-3">
            <div className="font-display font-semibold text-base">How it works</div>
            <div className="text-xs text-text-secondary">High-level summary, illustrative for this prototype</div>
            <ul className="list-disc pl-5 flex flex-col gap-2 text-sm leading-relaxed">
              {strategy.howItWorks.map((line, i) => <li key={i}>{line}</li>)}
            </ul>
          </div>
        )}

        <div className="bg-surface border border-border rounded-xl px-5 py-3.5 text-[13px] text-text-secondary leading-relaxed">
          Sample data shown for prototype purposes only. In production this section will show verified backtest and/or live performance data with disclosed methodology, time period, and benchmark. Past performance does not guarantee future results.
        </div>
      </main>
    </div>
  );
}

function StatTile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-2">
      <div className="text-xs uppercase tracking-wide text-text-secondary">{label}</div>
      <div className="text-[22px] font-semibold" style={color ? { color } : undefined}>{value}</div>
    </div>
  );
}
