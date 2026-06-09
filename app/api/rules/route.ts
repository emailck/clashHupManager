import { NextRequest } from "next/server";
import { db, listRules } from "@/lib/db";
import { jsonNoStore, requireAdmin } from "@/lib/security";

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;
  return jsonNoStore({ rules: listRules() });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json();
  const type = body.list_type === "direct" ? "direct" : "proxy";
  const lines = String(body.value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const maxOrder = db.prepare("select coalesce(max(sort_order), 0) as value from rules").get() as { value: number };
  const insert = db.prepare("insert into rules (list_type, value, enabled, sort_order) values (?, ?, 1, ?)");
  const tx = db.transaction(() => {
    lines.forEach((line, index) => insert.run(type, line, maxOrder.value + 10 + index));
  });
  tx();
  return jsonNoStore({ ok: true, rules: listRules() });
}
