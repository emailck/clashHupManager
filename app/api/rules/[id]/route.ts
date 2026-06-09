import { NextRequest } from "next/server";
import { db, listRules } from "@/lib/db";
import { jsonNoStore, requireAdmin } from "@/lib/security";

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await context.params;
  db.prepare("delete from rules where id = ?").run(id);
  return jsonNoStore({ ok: true, rules: listRules() });
}
