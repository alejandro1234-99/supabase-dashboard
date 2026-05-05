import { NextResponse } from "next/server";
import { refreshTable, invalidateAuthUsersCache } from "@/lib/auth-users-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  invalidateAuthUsersCache();
  const count = await refreshTable();
  return NextResponse.json({ ok: true, count });
}
