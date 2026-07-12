import { NextRequest } from "next/server";
import { db, getSubscriptionConfig, listNodes } from "@/lib/db";
import { jsonNoStore, requireUser } from "@/lib/security";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser(request);
  if (response) return response;

  const { id } = await context.params;
  const body = await request.json();
  const configId = Number(body.configId);
  if (!Number.isInteger(configId) || !getSubscriptionConfig(configId, user.id)) return jsonNoStore({ error: "配置不存在" }, { status: 404 });
  if (typeof body.enabled === "boolean") {
    db.prepare("update nodes set enabled = ?, updated_at = current_timestamp where id = ? and config_id = ?").run(body.enabled ? 1 : 0, id, configId);
  }
  if (typeof body.sort_order === "number") {
    db.prepare("update nodes set sort_order = ?, updated_at = current_timestamp where id = ? and config_id = ?").run(body.sort_order, id, configId);
  }
  return jsonNoStore({ ok: true, nodes: listNodes(configId) });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser(request);
  if (response) return response;

  const { id } = await context.params;
  const configId = Number(request.nextUrl.searchParams.get("configId"));
  if (!Number.isInteger(configId) || !getSubscriptionConfig(configId, user.id)) return jsonNoStore({ error: "配置不存在" }, { status: 404 });
  db.prepare("delete from nodes where id = ? and config_id = ?").run(id, configId);
  return jsonNoStore({ ok: true, nodes: listNodes(configId) });
}
