import { NextRequest, NextResponse } from "next/server";
import { evaluateAllActiveDeployments } from "@/lib/engine";

/**
 * Manually-triggered for now, on purpose: this endpoint places real orders
 * on real broker accounts if a deployment is pointed at one. Wiring it to
 * a recurring schedule is a deliberate follow-up decision, not a default.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-engine-secret");
  if (!secret || secret !== process.env.ENGINE_RUN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await evaluateAllActiveDeployments();
  return NextResponse.json({ results });
}
