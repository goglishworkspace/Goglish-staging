import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { hardDeleteDueUsers } from "@/lib/services/admin-user-management.service";

/** Called daily by pg_cron (see 20260730140008_user_hard_delete_cron.sql) -
 * protected by a shared secret since pg_net calls this without a user
 * session, same pattern as /api/payments/reconcile. */
export async function POST(request: NextRequest) {
  const expectedSecret = process.env.USER_HARD_DELETE_SECRET;
  const provided = Buffer.from(request.headers.get("x-user-hard-delete-secret") ?? "", "utf8");
  const expected = Buffer.from(expectedSecret ?? "", "utf8");
  if (!expectedSecret || provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await hardDeleteDueUsers();
  return NextResponse.json({ ok: true, ...result });
}
