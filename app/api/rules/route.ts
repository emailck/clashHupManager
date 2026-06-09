import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { db, listRules } from "@/lib/db";

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ rules: listRules() });
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
  return NextResponse.json({ ok: true, rules: listRules() });
}
