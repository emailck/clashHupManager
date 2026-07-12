import { NextRequest } from "next/server";
import { hashPassword } from "@/lib/auth";
import { getUserById, setUserEnabled, updateUserPassword } from "@/lib/db";
import { jsonNoStore, requireAdmin } from "@/lib/security";

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdmin(request);
  if (response) return response;

  const id = parseId((await context.params).id);
  const target = id ? getUserById(id) : undefined;
  if (!target) return jsonNoStore({ error: "用户不存在" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  if (typeof body.enabled === "boolean") {
    if (target.id === user.id && !body.enabled) return jsonNoStore({ error: "不能停用当前账户" }, { status: 400 });
    setUserEnabled(target.id, body.enabled);
  }
  if (typeof body.password === "string") {
    if (body.password.length < 8 || body.password.length > 128) return jsonNoStore({ error: "密码长度需为 8-128 位" }, { status: 400 });
    updateUserPassword(target.id, hashPassword(body.password));
  }
  return jsonNoStore({ ok: true });
}
