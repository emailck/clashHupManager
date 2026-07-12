import { NextRequest } from "next/server";
import { db, getSettings, getSubscriptionConfig } from "@/lib/db";
import { jsonNoStore, requireUser } from "@/lib/security";

function getConfigId(value: string | null, userId: number) {
  const configId = Number(value);
  return Number.isInteger(configId) && getSubscriptionConfig(configId, userId) ? configId : null;
}

export async function GET(request: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;
  const configId = getConfigId(request.nextUrl.searchParams.get("configId"), user.id);
  if (!configId) return jsonNoStore({ error: "配置不存在" }, { status: 404 });
  return jsonNoStore({ settings: getSettings(configId) });
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireUser(request);
  if (response) return response;

  const body = await request.json();
  const configId = getConfigId(String(body.configId || ""), user.id);
  if (!configId) return jsonNoStore({ error: "配置不存在" }, { status: 404 });
  const update = db.prepare("insert into config_settings (config_id, key, value) values (?, ?, ?) on conflict(config_id, key) do update set value = excluded.value");
  for (const key of ["default_proxy", "default_ai", "default_media", "default_fallback", "default_reject"]) {
    if (typeof body[key] === "string") update.run(configId, key, body[key]);
  }
  return jsonNoStore({ ok: true, settings: getSettings(configId) });
}
