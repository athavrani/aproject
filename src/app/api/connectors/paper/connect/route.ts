import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { tradingAccounts } from "@/db/schema";
import { getConnector } from "@/lib/brokers/registry";
import { encryptJson } from "@/lib/crypto";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const connector = getConnector("paper");
  const { session, brokerUserId } = await connector.connectDirect!();

  await db.insert(tradingAccounts).values({
    userId: user.id,
    broker: "paper",
    nickname: "Paper Trading Account",
    status: "connected",
    encryptedCredentials: encryptJson(session),
    brokerUserId,
  });

  return NextResponse.redirect(new URL("/connect-account", request.url));
}
