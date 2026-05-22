import { NextResponse } from "next/server";

/** Guard cron routes against unauthorized invocations. */
export function requireCron(request: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });
  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : header;
  if (provided !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return null;
}
