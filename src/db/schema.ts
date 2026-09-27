import {
  pgSchema,
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";

// Supabase's built-in auth schema — referenced, never managed by our migrations.
const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

export const riskLevelEnum = pgEnum("risk_level", ["low", "medium", "high"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
]);

// One row per authenticated user, created automatically via a DB trigger
// on auth.users insert (see src/db/sql/profile-trigger.sql).
export const profiles = pgTable("profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  fullName: text("full_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const strategies = pgTable("strategies", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  assetClass: text("asset_class").notNull(),
  riskLevel: riskLevelEnum("risk_level").notNull(),
  description: text("description").notNull(),
  priceCents: integer("price_cents").notNull(),
  billingCycle: text("billing_cycle").notNull().default("monthly"),
  cagrSample: numeric("cagr_sample", { precision: 5, scale: 2 }),
  maxDrawdownSample: numeric("max_drawdown_sample", { precision: 5, scale: 2 }),
  winRateSample: numeric("win_rate_sample", { precision: 5, scale: 2 }),
  sharpeSample: numeric("sharpe_sample", { precision: 4, scale: 2 }),
  howItWorks: text("how_it_works").array(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  strategyId: uuid("strategy_id")
    .notNull()
    .references(() => strategies.id, { onDelete: "restrict" }),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  subscribedAt: timestamp("subscribed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
});
