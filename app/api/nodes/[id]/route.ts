import { NextRequest } from "next/server";
import { db, listNodes } from "@/lib/db";
import { jsonNoStore, requireAdmin } from "@/lib/security";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await context.params;
  const body = await request.json();
  if (typeof body.enabled === "boolean") {
    db.prepare("update nodes set enabled = ?, updated_at = current_timestamp where id = ?").run(body.enabled ? 1 : 0, id);
  }
  if (typeof body.sort_order === "number") {
    db.prepare("update nodes set sort_order = ?, updated_at = current_timestamp where id = ?").run(body.sort_order, id);
  }
  return jsonNoStore({ ok: true, nodes: listNodes() });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await context.params;
  db.prepare("delete from nodes where id = ?").run(id);
  return jsonNoStore({ ok: true, nodes: listNodes() });
}
