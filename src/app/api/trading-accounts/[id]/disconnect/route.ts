import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { tradingAccounts } from "@/db/schema";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  await db
    .update(tradingAccounts)
    .set({ status: "disconnected", disconnectedAt: new Date(), encryptedCredentials: null })
    .where(and(eq(tradingAccounts.id, id), eq(tradingAccounts.userId, user.id)));

  return NextResponse.redirect(new URL("/connect-account", request.url));
}
