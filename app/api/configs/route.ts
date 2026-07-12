import { NextRequest } from "next/server";
import { createSubscriptionConfig, listSubscriptionConfigs } from "@/lib/db";
import { jsonNoStore, requireUser } from "@/lib/security";

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;
  return jsonNoStore({ configs: listSubscriptionConfigs(user.id) });
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireUser(request);
  if (response) return response;

  const name = String((await request.json()).name || "").trim();
  if (!name) return jsonNoStore({ error: "配置名称不能为空" }, { status: 400 });
  if (name.length > 80) return jsonNoStore({ error: "配置名称不能超过 80 个字符" }, { status: 400 });

  try {
    const config = createSubscriptionConfig(user.id, name);
    return jsonNoStore({ ok: true, config, configs: listSubscriptionConfigs(user.id) });
  } catch {
    return jsonNoStore({ error: "配置名称已存在" }, { status: 409 });
  }
}
