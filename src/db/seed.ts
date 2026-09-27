import { db } from "./index";
import { strategies } from "./schema";

const SAMPLE_STRATEGIES = [
  {
    slug: "momentum-surge",
    name: "Momentum Surge",
    category: "Momentum",
    assetClass: "Equities",
    riskLevel: "medium" as const,
    description:
      "Rides sustained price trends across large-cap equities using multi-timeframe momentum signals.",
    priceCents: 4900,
    cagrSample: "18.40",
    maxDrawdownSample: "-9.80",
    winRateSample: "64.00",
    sharpeSample: "1.80",
    howItWorks: [
      "Signal: 50/200-day moving average crossover, confirmed by relative-strength ranking",
      "Universe: S&P 500 large-cap equities",
      "Rebalance: Weekly",
      "Position sizing: Equal-weighted across the top 15 ranked signals",
    ],
  },
  {
    slug: "steady-income-options",
    name: "Steady Income Options",
    category: "Options Income",
    assetClass: "Derivatives",
    riskLevel: "low" as const,
    description:
      "Sells covered call and cash-secured put spreads on liquid index ETFs for consistent premium income.",
    priceCents: 7900,
    cagrSample: "9.20",
    howItWorks: [
      "Signal: sells covered calls and cash-secured puts on liquid index ETFs when implied volatility is favorable",
      "Universe: broad market index ETFs",
      "Rebalance: monthly, aligned to options expiry cycles",
      "Position sizing: premium collected is sized to keep assignment risk within account limits",
    ],
  },
  {
    slug: "mean-reversion-edge",
    name: "Mean Reversion Edge",
    category: "Mean Reversion",
    assetClass: "Equities",
    riskLevel: "medium" as const,
    description:
      "Fades short-term overextensions in mid-cap equities, entering when price deviates from its rolling average.",
    priceCents: 5900,
    cagrSample: "14.10",
    howItWorks: [
      "Signal: enters when price deviates significantly from its rolling average, expecting reversion",
      "Universe: mid-cap equities",
      "Rebalance: daily signal check",
      "Position sizing: scaled inversely to deviation magnitude, capped per position",
    ],
  },
  {
    slug: "trend-rider-fx",
    name: "Trend Rider FX",
    category: "Momentum",
    assetClass: "Forex",
    riskLevel: "high" as const,
    description:
      "Captures directional trends across major currency pairs using volatility-adjusted position sizing.",
    priceCents: 9900,
    cagrSample: "27.60",
    howItWorks: [
      "Signal: breakout plus moving-average trend confirmation across major currency pairs",
      "Universe: major FX pairs (e.g. EUR/USD, GBP/USD, USD/JPY)",
      "Rebalance: daily",
      "Position sizing: volatility-adjusted using ATR",
    ],
  },
  {
    slug: "volatility-harvester",
    name: "Volatility Harvester",
    category: "Options Income",
    assetClass: "Derivatives",
    riskLevel: "high" as const,
    description:
      "Sells short-dated volatility premium during high-IV regimes with defined-risk option spreads.",
    priceCents: 8900,
    cagrSample: "22.30",
    howItWorks: [
      "Signal: sells short-dated option spreads when implied volatility is elevated relative to realized volatility",
      "Universe: liquid single-name and index options",
      "Rebalance: weekly, aligned to short-dated expiries",
      "Position sizing: defined-risk spreads sized to cap max loss per trade",
    ],
  },
  {
    slug: "swing-breakout-pro",
    name: "Swing Breakout Pro",
    category: "Breakout",
    assetClass: "Equities",
    riskLevel: "low" as const,
    description:
      "Enters on confirmed breakouts from multi-day consolidation ranges with tight volatility-based stops.",
    priceCents: 3900,
    cagrSample: "11.70",
    howItWorks: [
      "Signal: enters on confirmed breakouts from multi-day consolidation ranges",
      "Universe: large- and mid-cap equities",
      "Rebalance: daily",
      "Position sizing: tight volatility-based stop-loss sizing per position",
    ],
  },
];

async function seed() {
  for (const strategy of SAMPLE_STRATEGIES) {
    await db
      .insert(strategies)
      .values(strategy)
      .onConflictDoUpdate({ target: strategies.slug, set: strategy });
  }
  console.log(`Seeded ${SAMPLE_STRATEGIES.length} strategies.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
