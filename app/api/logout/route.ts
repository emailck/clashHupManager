import { NextRequest } from "next/server";
import { clearSession } from "@/lib/auth";
import { jsonNoStore, requireAdmin } from "@/lib/security";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  await clearSession();
  return jsonNoStore({ ok: true });
}
