import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { db, listNodes } from "@/lib/db";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json();
  if (typeof body.enabled === "boolean") {
    db.prepare("update nodes set enabled = ?, updated_at = current_timestamp where id = ?").run(body.enabled ? 1 : 0, id);
  }
  if (typeof body.sort_order === "number") {
    db.prepare("update nodes set sort_order = ?, updated_at = current_timestamp where id = ?").run(body.sort_order, id);
  }
  return NextResponse.json({ ok: true, nodes: listNodes() });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await context.params;
  db.prepare("delete from nodes where id = ?").run(id);
  return NextResponse.json({ ok: true, nodes: listNodes() });
}
