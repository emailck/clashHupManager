import { NextRequest } from "next/server";
import { db, getSubscriptionConfig, listNodes } from "@/lib/db";
import { jsonNoStore, requireAdmin } from "@/lib/security";
import { parseVlessUri } from "@/lib/vless";

function getConfigId(value: string | null) {
  const configId = Number(value);
  return Number.isInteger(configId) && getSubscriptionConfig(configId) ? configId : null;
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;
  const configId = getConfigId(request.nextUrl.searchParams.get("configId"));
  if (!configId) return jsonNoStore({ error: "配置不存在" }, { status: 404 });
  return jsonNoStore({ nodes: listNodes(configId) });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json();
  const configId = getConfigId(String(body.configId || ""));
  if (!configId) return jsonNoStore({ error: "配置不存在" }, { status: 404 });
  const uri = String(body.uri || "").trim();
  let parsed;
  try {
    parsed = parseVlessUri(uri);
  } catch {
    return jsonNoStore({ error: "节点链接格式不正确" }, { status: 400 });
  }

  const name = String(body.name || parsed.name || "").trim();
  if (!name) return jsonNoStore({ error: "节点名称不能为空" }, { status: 400 });

  const maxOrder = db.prepare("select coalesce(max(sort_order), 0) as value from nodes where config_id = ?").get(configId) as { value: number };
  db.prepare(`
    insert into nodes (name, uri, enabled, sort_order, config_id, updated_at)
    values (?, ?, 1, ?, ?, current_timestamp)
    on conflict(name) do update set uri = excluded.uri, enabled = 1, config_id = excluded.config_id, updated_at = current_timestamp
  `).run(name, uri, maxOrder.value + 10, configId);
  return jsonNoStore({ ok: true, nodes: listNodes(configId) });
}
