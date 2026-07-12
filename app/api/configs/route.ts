import { NextRequest } from "next/server";
import { createSubscriptionConfig, listSubscriptionConfigs } from "@/lib/db";
import { jsonNoStore, requireAdmin } from "@/lib/security";

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;
  return jsonNoStore({ configs: listSubscriptionConfigs() });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const name = String((await request.json()).name || "").trim();
  if (!name) return jsonNoStore({ error: "配置名称不能为空" }, { status: 400 });
  if (name.length > 80) return jsonNoStore({ error: "配置名称不能超过 80 个字符" }, { status: 400 });

  try {
    const config = createSubscriptionConfig(name);
    return jsonNoStore({ ok: true, config, configs: listSubscriptionConfigs() });
  } catch {
    return jsonNoStore({ error: "配置名称已存在" }, { status: 409 });
  }
}
