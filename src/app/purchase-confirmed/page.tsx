import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getCheckoutSession, recordSubscriptionFromSession } from "@/lib/record-subscription";
import { db } from "@/db";
import { strategies } from "@/db/schema";
import Nav from "@/components/nav";

export const dynamic = "force-dynamic";

export default async function PurchaseConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!sessionId) redirect("/strategies");

  const session = await getCheckoutSession(sessionId);
  if (session.metadata?.userId !== user.id) {
    // Session belongs to someone else — don't leak details.
    redirect("/strategies");
  }

  await recordSubscriptionFromSession(session);

  const strategyId = session.metadata?.strategyId;
  const strategy = strategyId
    ? await db.query.strategies.findFirst({ where: eq(strategies.id, strategyId) })
    : null;

  const paid = session.payment_status === "paid" || session.status === "complete";

  return (
    <div className="w-full min-h-screen">
      <Nav active="none" userEmail={user.email} />
      <div className="w-full flex items-center justify-center p-6" style={{ minHeight: "calc(100vh - 69px)" }}>
        <div className="w-full max-w-[460px] bg-surface border border-border rounded-2xl p-10 flex flex-col items-center text-center gap-5">
          {paid ? (
            <>
              <div className="w-14 h-14 rounded-full bg-[#E3F3EA] flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16794F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div className="flex flex-col gap-1.5">
                <h1 className="font-display font-semibold text-xl">
                  {strategy ? `You're subscribed to ${strategy.name}` : "Subscription confirmed"}
                </h1>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Your subscription is active. Connect a trading account to deploy this strategy once that's available.
                </p>
              </div>
            </>
          ) : (
            <div className="font-display font-semibold text-lg">Payment not completed</div>
          )}
          <div className="flex flex-col gap-3 w-full mt-2">
            <a href="/my-strategies" className="flex items-center justify-center bg-accent text-white rounded-lg py-3 text-sm font-semibold">
              Go to My Strategies
            </a>
            <a href="/strategies" className="flex items-center justify-center border border-border rounded-lg py-3 text-sm font-semibold">
              Browse more strategies
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
