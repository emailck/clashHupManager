import { NextRequest } from "next/server";
import { createSession, hashPassword } from "@/lib/auth";
import { createUser, getUserByUsername } from "@/lib/db";
import { checkLoginRateLimit, clearLoginFailures, recordLoginFailure } from "@/lib/rate-limit";
import { jsonNoStore, requireSameOrigin } from "@/lib/security";
import { validateCredentials } from "@/app/api/user-validation";

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const limitError = checkLoginRateLimit(request);
  if (limitError) return limitError;

  const body = await request.json().catch(() => ({}));
  const credentials = validateCredentials(body.username, body.password);
  if ("error" in credentials) return jsonNoStore({ error: credentials.error }, { status: 400 });
  if (getUserByUsername(credentials.username)) return jsonNoStore({ error: "用户名已存在" }, { status: 409 });

  try {
    const user = createUser(credentials.username, hashPassword(credentials.password));
    clearLoginFailures(request);
    await createSession(user.id);
    return jsonNoStore({ ok: true });
  } catch {
    recordLoginFailure(request);
    return jsonNoStore({ error: "注册失败" }, { status: 400 });
  }
}
