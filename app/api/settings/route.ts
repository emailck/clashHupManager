import { NextRequest } from "next/server";
import { db, getSettings } from "@/lib/db";
import { jsonNoStore, requireAdmin } from "@/lib/security";

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;
  return jsonNoStore({ settings: getSettings() });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json();
  const update = db.prepare("insert into settings (key, value) values (?, ?) on conflict(key) do update set value = excluded.value");
  for (const key of ["default_proxy", "default_ai", "default_media", "default_fallback", "default_reject"]) {
    if (typeof body[key] === "string") update.run(key, body[key]);
  }
  return jsonNoStore({ ok: true, settings: getSettings() });
}
