import { NextRequest } from "next/server";
import { hashPassword } from "@/lib/auth";
import { createUser, getUserByUsername, listUsers } from "@/lib/db";
import { jsonNoStore, requireAdmin } from "@/lib/security";
import { validateCredentials } from "@/app/api/user-validation";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  return jsonNoStore({ users: listUsers() });
}

export async function POST(request: NextRequest) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  const body = await request.json().catch(() => ({}));
  const credentials = validateCredentials(body.username, body.password);
  if ("error" in credentials) return jsonNoStore({ error: credentials.error }, { status: 400 });
  if (getUserByUsername(credentials.username)) return jsonNoStore({ error: "用户名已存在" }, { status: 409 });

  try {
    const user = createUser(credentials.username, hashPassword(credentials.password));
    return jsonNoStore({ ok: true, user: { id: user.id, username: user.username, role: user.role, enabled: user.enabled } });
  } catch {
    return jsonNoStore({ error: "创建用户失败" }, { status: 400 });
  }
}
