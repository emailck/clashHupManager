import { NextRequest } from "next/server";
import { db, getSubscriptionConfig, listRules } from "@/lib/db";
import { jsonNoStore, requireUser } from "@/lib/security";

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser(request);
  if (response) return response;

  const { id } = await context.params;
  const configId = Number(request.nextUrl.searchParams.get("configId"));
  if (!Number.isInteger(configId) || !getSubscriptionConfig(configId, user.id)) return jsonNoStore({ error: "配置不存在" }, { status: 404 });
  db.prepare("delete from rules where id = ? and config_id = ?").run(id, configId);
  return jsonNoStore({ ok: true, rules: listRules(configId) });
}
