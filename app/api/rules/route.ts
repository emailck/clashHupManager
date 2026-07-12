import { NextRequest } from "next/server";
import { db, getSubscriptionConfig, listRules } from "@/lib/db";
import { jsonNoStore, requireAdmin } from "@/lib/security";

function getConfigId(value: string | null) {
  const configId = Number(value);
  return Number.isInteger(configId) && getSubscriptionConfig(configId) ? configId : null;
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;
  const configId = getConfigId(request.nextUrl.searchParams.get("configId"));
  if (!configId) return jsonNoStore({ error: "配置不存在" }, { status: 404 });
  return jsonNoStore({ rules: listRules(configId) });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json();
  const configId = getConfigId(String(body.configId || ""));
  if (!configId) return jsonNoStore({ error: "配置不存在" }, { status: 404 });
  const type = body.list_type === "direct" ? "direct" : "proxy";
  const lines = String(body.value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const maxOrder = db.prepare("select coalesce(max(sort_order), 0) as value from rules where config_id = ?").get(configId) as { value: number };
  const insert = db.prepare("insert into rules (list_type, value, enabled, sort_order, config_id) values (?, ?, 1, ?, ?)");
  const tx = db.transaction(() => {
    lines.forEach((line, index) => insert.run(type, line, maxOrder.value + 10 + index, configId));
  });
  tx();
  return jsonNoStore({ ok: true, rules: listRules(configId) });
}
