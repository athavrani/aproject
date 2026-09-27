import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { tradingAccounts } from "@/db/schema";
import { getConnector } from "@/lib/brokers/registry";
import { encryptJson } from "@/lib/crypto";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());

  if (params.status !== "success") {
    return NextResponse.redirect(
      new URL(`/connect-account?error=${encodeURIComponent(params.status ?? "login_failed")}`, request.url)
    );
  }

  try {
    const connector = getConnector("zerodha");
    const { session, brokerUserId, expiresAt } = await connector.exchangeLoginCallback!(params);

    await db.insert(tradingAccounts).values({
      userId: user.id,
      broker: "zerodha",
      nickname: `Zerodha (${brokerUserId})`,
      status: "connected",
      encryptedCredentials: encryptJson(session),
      brokerUserId,
      expiresAt,
    });

    return NextResponse.redirect(new URL("/connect-account?connected=zerodha", request.url));
  } catch (err) {
    console.error("Zerodha callback failed:", err);
    return NextResponse.redirect(
      new URL(`/connect-account?error=${encodeURIComponent("exchange_failed")}`, request.url)
    );
  }
}
