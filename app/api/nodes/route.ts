import { NextRequest } from "next/server";
import { db, getSubscriptionConfig, listNodes } from "@/lib/db";
import { jsonNoStore, requireUser } from "@/lib/security";
import { parseVlessUri } from "@/lib/vless";

function getConfigId(value: string | null, userId: number) {
  const configId = Number(value);
  return Number.isInteger(configId) && getSubscriptionConfig(configId, userId) ? configId : null;
}

function splitNodeUris(value: string) {
  return value
    .split(/\r?\n/)
    .flatMap((line) => line.split(/(?=vless:\/\/)/g))
    .map((line) => line.trim())
    .filter(Boolean);
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
  return jsonNoStore({ nodes: listNodes(configId) });
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireUser(request);
  if (response) return response;

  const body = await request.json();
  const configId = getConfigId(String(body.configId || ""), user.id);
  if (!configId) return jsonNoStore({ error: "配置不存在" }, { status: 404 });
  const uris = splitNodeUris(String(body.uri || ""));
  if (uris.length === 0) return jsonNoStore({ error: "节点链接不能为空" }, { status: 400 });

  const existingRows = db.prepare("select name from nodes where config_id = ?").all(configId) as Array<{ name: string }>;
  const existingNames = new Set(existingRows.map((row) => row.name));
  const maxOrder = db.prepare("select coalesce(max(sort_order), 0) as value from nodes where config_id = ?").get(configId) as { value: number };
  const rows: Array<{ name: string; uri: string; sortOrder: number }> = [];
  const errors: string[] = [];

  uris.forEach((uri, index) => {
    try {
      const parsed = parseVlessUri(uri);
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

  return jsonNoStore({ ok: true, added: rows.length, errors, nodes: listNodes(configId) });
}
