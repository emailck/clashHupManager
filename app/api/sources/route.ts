import { NextRequest } from "next/server";
import { getSubscriptionConfig, listNodes } from "@/lib/db";
import { jsonNoStore, requireUser } from "@/lib/security";
import { importSubscription, listSubscriptionSources, removeSubscription, subscriptionSourcesView } from "@/lib/subscriptions";

async function mutateSource(request: NextRequest, remove: boolean) {
  const { user, response } = await requireUser(request);
  if (response) return response;
  const body = await request.json();
  const configId = Number(body.configId);
  if (!Number.isInteger(configId) || !getSubscriptionConfig(configId, user.id)) return jsonNoStore({ error: "配置不存在" }, { status: 404 });
  const source = listSubscriptionSources(configId).find((item) => item.id === Number(body.sourceId));
  if (!source) return jsonNoStore({ error: "上游订阅不存在" }, { status: 404 });
  try {
    if (remove) removeSubscription(configId, source.id);
    else await importSubscription(configId, source.url);
    return jsonNoStore({ ok: true, nodes: listNodes(configId), sources: subscriptionSourcesView(configId) });
  } catch (error) {
    return jsonNoStore({ error: error instanceof Error && !/SQLITE/i.test(error.message) ? error.message : "更新订阅失败" }, { status: 400 });
  }
}

export async function POST(request: NextRequest) { return mutateSource(request, false); }
export async function DELETE(request: NextRequest) { return mutateSource(request, true); }
