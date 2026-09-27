import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { tradingAccounts } from "@/db/schema";
import { getConnector } from "@/lib/brokers/registry";
import { decryptJson } from "@/lib/crypto";
import type { BrokerSession } from "@/lib/brokers/types";
import Nav from "@/components/nav";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  login_failed: "Zerodha login was not completed. Please try again.",
  exchange_failed: "Could not connect — Zerodha rejected the login exchange. Please try again.",
};

async function fetchBalance(broker: string, encryptedCredentials: string | null) {
  if (!encryptedCredentials) return { error: "No stored session" };
  try {
    const connector = getConnector(broker);
    const session = decryptJson<BrokerSession>(encryptedCredentials);
    const balance = await connector.getAccountBalance(session);
    return { balance };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not fetch balance" };
  }
}

export default async function ConnectAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const { error, connected } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accounts = await db.query.tradingAccounts.findMany({
    where: and(eq(tradingAccounts.userId, user.id), eq(tradingAccounts.status, "connected")),
    orderBy: (t, { desc }) => [desc(t.connectedAt)],
  });

  const accountsWithBalance = await Promise.all(
    accounts.map(async (a) => ({ account: a, ...(await fetchBalance(a.broker, a.encryptedCredentials)) }))
  );

  const zerodhaLoginUrl = getConnector("zerodha").getLoginUrl!();

  return (
    <div className="w-full min-h-screen">
      <Nav active="none" userEmail={user.email} />

      <main className="max-w-3xl mx-auto p-10 flex flex-col gap-6">
        <div>
          <h1 className="font-display font-semibold text-2xl">Connect a trading account</h1>
          <p className="text-text-secondary text-sm mt-1">
            Connect a real or paper trading account. Deploying a strategy to it comes in Phase 4.
          </p>
        </div>

        {error && (
          <div className="bg-[#FDE7E5] border border-[#F3B4AE] text-[#8A1F1B] rounded-lg px-4 py-3 text-sm">
            {ERROR_MESSAGES[error] ?? "Something went wrong connecting your account."}
          </div>
        )}
        {connected === "zerodha" && (
          <div className="bg-[#E3F3EA] border border-[#B7E0C7] text-[#16794F] rounded-lg px-4 py-3 text-sm">
            Zerodha account connected successfully.
          </div>
        )}

        <div className="bg-surface border border-border rounded-xl p-6 flex flex-col gap-3">
          <div className="font-display font-semibold text-base">Your trading accounts</div>
          {accountsWithBalance.length === 0 ? (
            <div className="flex items-center justify-center py-8 border border-dashed border-border rounded-lg text-sm text-text-secondary">
              No trading accounts connected yet
            </div>
          ) : (
            accountsWithBalance.map(({ account, balance, error: balanceError }) => (
              <div key={account.id} className="flex items-center justify-between gap-4 p-4 border border-border rounded-lg flex-wrap">
                <div>
                  <div className="text-sm font-semibold">{account.nickname}</div>
                  <div className="text-xs text-text-secondary">
                    {getConnector(account.broker).displayName}
                    {balance && ` · ${balance.currency} ${balance.available.toLocaleString()} available`}
                    {balanceError && ` · ${balanceError}`}
                  </div>
                </div>
                <form action={`/api/trading-accounts/${account.id}/disconnect`} method="POST">
                  <button type="submit" className="px-3.5 py-2 rounded-lg border border-[#B42318] text-[#B42318] text-xs font-semibold">
                    Disconnect
                  </button>
                </form>
              </div>
            ))
          )}
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 flex flex-col gap-4">
          <div className="font-display font-semibold text-base">Connect a new account</div>

          <div className="flex items-center justify-between gap-4 p-4 border border-border rounded-lg flex-wrap">
            <div>
              <div className="text-sm font-semibold">Zerodha Kite</div>
              <div className="text-xs text-text-secondary">Connect your real Zerodha trading account</div>
            </div>
            <a href={zerodhaLoginUrl} className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold">
              Connect
            </a>
          </div>

          <div className="flex items-center justify-between gap-4 p-4 border border-border rounded-lg flex-wrap">
            <div>
              <div className="text-sm font-semibold">Paper Trading (Demo)</div>
              <div className="text-xs text-text-secondary">Simulated account with $100,000 demo cash — no real broker</div>
            </div>
            <form action="/api/connectors/paper/connect" method="POST">
              <button type="submit" className="px-4 py-2 rounded-lg border border-border text-sm font-semibold">
                Connect
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
