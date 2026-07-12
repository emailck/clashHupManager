import { NextRequest } from "next/server";
import { createSession, verifyUserPassword } from "@/lib/auth";
import { checkLoginRateLimit, clearLoginFailures, recordLoginFailure } from "@/lib/rate-limit";
import { jsonNoStore, requireSameOrigin } from "@/lib/security";

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const limitError = checkLoginRateLimit(request);
  if (limitError) return limitError;

  const body = await request.json().catch(() => ({}));
  const user = verifyUserPassword(String(body.username || "admin").trim() || "admin", String(body.password || ""));
  if (!user) {
    recordLoginFailure(request);
    return jsonNoStore({ error: "密码不正确" }, { status: 401 });
  }

  clearLoginFailures(request);
  await createSession(user.id);
  return jsonNoStore({ ok: true });
}
