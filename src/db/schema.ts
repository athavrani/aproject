import { relations } from "drizzle-orm";
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
export const brokerEnum = pgEnum("broker", ["paper", "zerodha"]);
export const tradingAccountStatusEnum = pgEnum("trading_account_status", [
  "connected",
  "disconnected",
  "error",
]);
export const deploymentStatusEnum = pgEnum("deployment_status", [
  "active",
  "paused",
  "stopped",
]);
export const orderSideEnum = pgEnum("order_side", ["BUY", "SELL"]);

// One row per authenticated user, created automatically via a DB trigger
// on auth.users insert (see src/db/sql/profile-trigger.sql).
export const profiles = pgTable("profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  fullName: text("full_name"),
  stripeCustomerId: text("stripe_customer_id"),
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
  stripePriceId: text("stripe_price_id"),
  stripeProductId: text("stripe_product_id"),
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
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  subscribedAt: timestamp("subscribed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
});

export const tradingAccounts = pgTable("trading_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  broker: brokerEnum("broker").notNull(),
  nickname: text("nickname").notNull(),
  status: tradingAccountStatusEnum("status").notNull().default("connected"),
  // Opaque, encrypted JSON blob — shape is broker-specific (e.g. Zerodha's
  // access_token + user id). Never stored or logged in plaintext.
  encryptedCredentials: text("encrypted_credentials"),
  brokerUserId: text("broker_user_id"),
  connectedAt: timestamp("connected_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  disconnectedAt: timestamp("disconnected_at", { withTimezone: true }),
});

export const tradingAccountsRelations = relations(tradingAccounts, ({ one }) => ({
  profile: one(profiles, {
    fields: [tradingAccounts.userId],
    references: [profiles.id],
  }),
}));

export const deployments = pgTable("deployments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  strategyId: uuid("strategy_id")
    .notNull()
    .references(() => strategies.id, { onDelete: "restrict" }),
  tradingAccountId: uuid("trading_account_id")
    .notNull()
    .references(() => tradingAccounts.id, { onDelete: "restrict" }),
  status: deploymentStatusEnum("status").notNull().default("active"),
  capitalAllocation: numeric("capital_allocation", { precision: 12, scale: 2 }).notNull(),
  maxDailyLoss: numeric("max_daily_loss", { precision: 12, scale: 2 }).notNull(),
  realizedPnlToday: numeric("realized_pnl_today", { precision: 12, scale: 2 }).notNull().default("0"),
  pnlDate: text("pnl_date"), // "YYYY-MM-DD" the realizedPnlToday figure applies to; resets on a new day
  riskAcknowledgedAt: timestamp("risk_acknowledged_at", { withTimezone: true }).notNull(),
  lastEvaluatedAt: timestamp("last_evaluated_at", { withTimezone: true }),
  pausedReason: text("paused_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  deploymentId: uuid("deployment_id")
    .notNull()
    .references(() => deployments.id, { onDelete: "cascade" }),
  brokerOrderId: text("broker_order_id").notNull(),
  symbol: text("symbol").notNull(),
  side: orderSideEnum("side").notNull(),
  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  pnl: numeric("pnl", { precision: 12, scale: 2 }),
  placedAt: timestamp("placed_at", { withTimezone: true }).defaultNow().notNull(),
});

export const deploymentsRelations = relations(deployments, ({ one, many }) => ({
  strategy: one(strategies, { fields: [deployments.strategyId], references: [strategies.id] }),
  tradingAccount: one(tradingAccounts, {
    fields: [deployments.tradingAccountId],
    references: [tradingAccounts.id],
  }),
  profile: one(profiles, { fields: [deployments.userId], references: [profiles.id] }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  deployment: one(deployments, { fields: [orders.deploymentId], references: [deployments.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  strategy: one(strategies, {
    fields: [subscriptions.strategyId],
    references: [strategies.id],
  }),
  profile: one(profiles, {
    fields: [subscriptions.userId],
    references: [profiles.id],
  }),
}));

export const strategiesRelations = relations(strategies, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const profilesRelations = relations(profiles, ({ many }) => ({
  subscriptions: many(subscriptions),
}));
