"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { strategies as strategiesTable } from "@/db/schema";

type Strategy = typeof strategiesTable.$inferSelect;

const RISK_STYLES: Record<string, string> = {
  low: "bg-[#E3F3EA] text-[#16794F]",
  medium: "bg-[#FBF0DD] text-[#A15C00]",
  high: "bg-[#FDE7E5] text-[#B42318]",
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(0)}/mo`;
}

export default function StrategyGrid({
  strategies,
  subscribedStrategyIds,
}: {
  strategies: Strategy[];
  subscribedStrategyIds: string[];
}) {
  const subscribedSet = useMemo(() => new Set(subscribedStrategyIds), [subscribedStrategyIds]);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return strategies;
    return strategies.filter((s) =>
      `${s.name} ${s.category} ${s.assetClass}`.toLowerCase().includes(q)
    );
  }, [strategies, query]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search strategies..."
          className="w-56 px-3 py-2 border border-border rounded-lg text-sm focus:outline-2 focus:outline-accent"
        />
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {filtered.map((s) => (
          <div key={s.id} className="bg-surface border border-border rounded-xl p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="font-display font-semibold text-lg">{s.name}</div>
                <div className="text-sm text-text-secondary">{s.category} · {s.assetClass}</div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <div className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${RISK_STYLES[s.riskLevel]}`}>
                  {s.riskLevel[0].toUpperCase() + s.riskLevel.slice(1)} risk
                </div>
                {subscribedSet.has(s.id) && (
                  <div className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-[#EDF1FC] text-accent">
                    ✓ Subscribed
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">{s.description}</p>
            <div className="flex gap-6 py-3 border-y border-border">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-text-secondary">CAGR (sample)</div>
                <div className="text-base font-semibold text-[#15803D]">
                  {s.cagrSample ? `+${s.cagrSample}%` : "—"}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-text-secondary">Price</div>
                <div className="text-base font-semibold">{formatPrice(s.priceCents)}</div>
              </div>
            </div>
            <Link
              href={`/strategies/${s.slug}`}
              className="text-center py-2.5 rounded-lg border border-accent text-accent font-semibold text-sm hover:bg-accent hover:text-white transition-colors"
            >
              View Details
            </Link>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-10 text-text-secondary text-sm">
          No strategies match your search.
        </div>
      )}
    </div>
  );
}
