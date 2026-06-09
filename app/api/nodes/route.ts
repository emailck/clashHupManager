import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { db, listNodes } from "@/lib/db";
import { parseVlessUri } from "@/lib/vless";

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ nodes: listNodes() });
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json();
  const uri = String(body.uri || "").trim();
  const parsed = parseVlessUri(uri);
  const name = String(body.name || parsed.name || "").trim();
  if (!name) return NextResponse.json({ error: "节点名称不能为空" }, { status: 400 });
  const maxOrder = db.prepare("select coalesce(max(sort_order), 0) as value from nodes").get() as { value: number };
  db.prepare(`
    insert into nodes (name, uri, enabled, sort_order, updated_at)
    values (?, ?, 1, ?, current_timestamp)
    on conflict(name) do update set uri = excluded.uri, enabled = 1, updated_at = current_timestamp
  `).run(name, uri, maxOrder.value + 10);
  return NextResponse.json({ ok: true, nodes: listNodes() });
}
