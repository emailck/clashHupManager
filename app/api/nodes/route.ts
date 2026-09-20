import { NextRequest } from "next/server";
import { db, getSubscriptionConfig, listNodes } from "@/lib/db";
import { jsonNoStore, requireUser } from "@/lib/security";
import { parseNodeUri, splitNodeUris } from "@/lib/node-uri";
import { importSubscription, subscriptionSourcesView } from "@/lib/subscriptions";

function getConfigId(value: string | null, userId: number) {
  const configId = Number(value);
  return Number.isInteger(configId) && getSubscriptionConfig(configId, userId) ? configId : null;
}

function makeUniqueName(baseName: string, existingNames: Set<string>) {
  let name = baseName;
  let index = 2;
  while (existingNames.has(name)) {
    name = `${baseName}-${index}`;
    index += 1;
  }
  existingNames.add(name);
  return name;
}

export async function GET(request: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;
  const configId = getConfigId(request.nextUrl.searchParams.get("configId"), user.id);
  if (!configId) return jsonNoStore({ error: "配置不存在" }, { status: 404 });
  return jsonNoStore({ nodes: listNodes(configId), sources: subscriptionSourcesView(configId) });
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireUser(request);
  if (response) return response;

  const body = await request.json();
  const configId = getConfigId(String(body.configId || ""), user.id);
  if (!configId) return jsonNoStore({ error: "配置不存在" }, { status: 404 });
  const input = String(body.uri || "").trim();
  if (/^https?:\/\//i.test(input)) {
    if (/\s/.test(input)) return jsonNoStore({ error: "请每次添加一个上游订阅地址" }, { status: 400 });
    try {
      const result = await importSubscription(configId, input);
      return jsonNoStore({ ok: true, ...result, imported: true, nodes: listNodes(configId), sources: subscriptionSourcesView(configId) });
    } catch (error) {
      return jsonNoStore({ error: error instanceof Error && !/SQLITE/i.test(error.message) ? error.message : "导入订阅失败" }, { status: 400 });
    }
  }
  const uris = splitNodeUris(input);
  if (uris.length === 0) return jsonNoStore({ error: "节点链接不能为空" }, { status: 400 });

  const existingRows = db.prepare("select name from nodes where config_id = ?").all(configId) as Array<{ name: string }>;
  const existingNames = new Set(existingRows.map((row) => row.name));
  const maxOrder = db.prepare("select coalesce(max(sort_order), 0) as value from nodes where config_id = ?").get(configId) as { value: number };
  const rows: Array<{ name: string; uri: string; sortOrder: number }> = [];
  const errors: string[] = [];

  uris.forEach((uri, index) => {
    try {
      const parsed = parseNodeUri(uri);
      const requestedName = uris.length === 1 && typeof body.name === "string" ? body.name : "";
      const baseName = String(requestedName || parsed.name || "").trim();
      if (!baseName) throw new Error("节点名称不能为空");
      rows.push({
        name: makeUniqueName(baseName, existingNames),
        uri,
        sortOrder: maxOrder.value + (index + 1) * 10,
      });
    } catch {
      errors.push(`第 ${index + 1} 个节点链接格式不正确`);
    }
  });

  if (rows.length === 0) return jsonNoStore({ error: errors.join("；") || "节点链接格式不正确" }, { status: 400 });

  const insert = db.prepare(`
    insert into nodes (name, uri, enabled, sort_order, config_id, updated_at)
    values (?, ?, 1, ?, ?, current_timestamp)
  `);
  db.transaction(() => {
    for (const row of rows) insert.run(row.name, row.uri, row.sortOrder, configId);
  })();

  return jsonNoStore({ ok: true, added: rows.length, errors, nodes: listNodes(configId), sources: subscriptionSourcesView(configId) });
}
