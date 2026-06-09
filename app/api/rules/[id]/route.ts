import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { db, listRules } from "@/lib/db";

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await context.params;
  db.prepare("delete from rules where id = ?").run(id);
  return NextResponse.json({ ok: true, rules: listRules() });
}
