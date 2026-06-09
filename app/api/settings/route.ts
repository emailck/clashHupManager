import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { db, getSettings } from "@/lib/db";

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ settings: getSettings() });
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json();
  const update = db.prepare("insert into settings (key, value) values (?, ?) on conflict(key) do update set value = excluded.value");
  for (const key of ["default_proxy", "default_ai", "default_media", "default_fallback", "default_reject"]) {
    if (typeof body[key] === "string") update.run(key, body[key]);
  }
  return NextResponse.json({ ok: true, settings: getSettings() });
}
