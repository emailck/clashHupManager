import { NextRequest } from "next/server";
import { deleteSubscriptionConfig, getSubscriptionConfig, listSubscriptionConfigs, updateSubscriptionConfig } from "@/lib/db";
import { jsonNoStore, requireAdmin } from "@/lib/security";

function parseConfigId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const id = parseConfigId((await context.params).id);
  const name = String((await request.json()).name || "").trim();
  if (!id || !getSubscriptionConfig(id)) return jsonNoStore({ error: "配置不存在" }, { status: 404 });
  if (!name) return jsonNoStore({ error: "配置名称不能为空" }, { status: 400 });
  if (name.length > 80) return jsonNoStore({ error: "配置名称不能超过 80 个字符" }, { status: 400 });

  try {
    return jsonNoStore({ ok: true, config: updateSubscriptionConfig(id, name), configs: listSubscriptionConfigs() });
  } catch {
    return jsonNoStore({ error: "配置名称已存在" }, { status: 409 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const id = parseConfigId((await context.params).id);
  if (!id || !getSubscriptionConfig(id)) return jsonNoStore({ error: "配置不存在" }, { status: 404 });
  if (listSubscriptionConfigs().length === 1) return jsonNoStore({ error: "至少保留一份配置" }, { status: 400 });

  deleteSubscriptionConfig(id);
  return jsonNoStore({ ok: true, configs: listSubscriptionConfigs() });
}
