"use client";

import { useMemo, useState } from "react";

type Account = { id: string; nickname: string; broker: string };

export default function DeployForm({
  subscriptionId,
  accounts,
}: {
  subscriptionId: string;
  accounts: Account[];
}) {
  const defaultAccountId = useMemo(
    () => accounts.find((a) => a.broker === "paper")?.id ?? accounts[0].id,
    [accounts]
  );
  const [accountId, setAccountId] = useState(defaultAccountId);
  const selected = accounts.find((a) => a.id === accountId);
  const isRealBroker = Boolean(selected && selected.broker !== "paper");

  return (
    <form
      action="/api/deployments"
      method="POST"
      className="bg-surface border border-border rounded-xl p-6 flex flex-col gap-5"
    >
      <input type="hidden" name="subscriptionId" value={subscriptionId} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tradingAccountId" className="text-sm font-medium">Trading account</label>
        <select
          id="tradingAccountId"
          name="tradingAccountId"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="px-3 py-2.5 border border-border rounded-lg text-sm bg-surface"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nickname} — {a.broker === "paper" ? "Paper Trading (simulated)" : "Zerodha Kite (real account)"}
            </option>
          ))}
        </select>
        {isRealBroker && (
          <div className="text-xs text-[#B42318] font-medium mt-0.5">
            This is a real broker account — orders placed here use real money.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="capitalAllocation" className="text-sm font-medium">Capital allocation</label>
        <input
          id="capitalAllocation"
          type="number"
          name="capitalAllocation"
          min="1"
          step="1"
          required
          defaultValue={isRealBroker ? "" : "5000"}
          placeholder="e.g. 5000"
          className="px-3 py-2.5 border border-border rounded-lg text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="maxDailyLoss" className="text-sm font-medium">Max daily loss limit</label>
        <input
          id="maxDailyLoss"
          type="number"
          name="maxDailyLoss"
          min="1"
          step="1"
          required
          defaultValue={isRealBroker ? "" : "500"}
          placeholder="e.g. 500"
          className="px-3 py-2.5 border border-border rounded-lg text-sm"
        />
        <div className="text-xs text-text-secondary">The deployment auto-pauses if this loss limit is reached.</div>
      </div>

      <div className="flex items-start gap-2.5">
        <input id="riskAck" type="checkbox" name="riskAck" required className="mt-0.5" />
        <label htmlFor="riskAck" className="text-sm text-text-secondary leading-relaxed">
          I understand this strategy will place trades automatically and that I may lose part or all of my allocated capital.
        </label>
      </div>

      {isRealBroker && (
        <div className="flex items-start gap-2.5 bg-[#FDE7E5] border border-[#F3B4AE] rounded-lg p-3.5">
          <input id="realBrokerAck" type="checkbox" name="realBrokerAck" required className="mt-0.5" />
          <label htmlFor="realBrokerAck" className="text-sm text-[#8A1F1B] leading-relaxed">
            <strong>This is a real, connected broker account.</strong> I understand this will place real orders with
            real money on my Zerodha account once this deployment is active, and that the trading logic used is an
            illustrative placeholder, not a validated strategy.
          </label>
        </div>
      )}

      <button type="submit" className="bg-accent text-white rounded-lg py-3 text-sm font-semibold">
        Deploy Strategy
      </button>
    </form>
  );
}
