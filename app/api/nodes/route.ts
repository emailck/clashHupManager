import { NextRequest } from "next/server";
import { db, listNodes } from "@/lib/db";
import { jsonNoStore, requireAdmin } from "@/lib/security";
import { parseVlessUri } from "@/lib/vless";

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;
  return jsonNoStore({ nodes: listNodes() });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json();
  const uri = String(body.uri || "").trim();
  let parsed;
  try {
    parsed = parseVlessUri(uri);
  } catch {
    return jsonNoStore({ error: "节点链接格式不正确" }, { status: 400 });
  }

  const name = String(body.name || parsed.name || "").trim();
  if (!name) return jsonNoStore({ error: "节点名称不能为空" }, { status: 400 });

  const maxOrder = db.prepare("select coalesce(max(sort_order), 0) as value from nodes").get() as { value: number };
  db.prepare(`
    insert into nodes (name, uri, enabled, sort_order, updated_at)
    values (?, ?, 1, ?, current_timestamp)
    on conflict(name) do update set uri = excluded.uri, enabled = 1, updated_at = current_timestamp
  `).run(name, uri, maxOrder.value + 10);
  return jsonNoStore({ ok: true, nodes: listNodes() });
}
