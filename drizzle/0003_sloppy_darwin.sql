CREATE TYPE "public"."broker" AS ENUM('paper', 'zerodha');--> statement-breakpoint
CREATE TYPE "public"."trading_account_status" AS ENUM('connected', 'disconnected', 'error');--> statement-breakpoint
CREATE TABLE "trading_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"broker" "broker" NOT NULL,
	"nickname" text NOT NULL,
	"status" "trading_account_status" DEFAULT 'connected' NOT NULL,
	"encrypted_credentials" text,
	"broker_user_id" text,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"disconnected_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "trading_accounts" ADD CONSTRAINT "trading_accounts_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;