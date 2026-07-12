import { NextRequest } from "next/server";
import { clearSession } from "@/lib/auth";
import { jsonNoStore, requireUser } from "@/lib/security";

export async function POST(request: NextRequest) {
  const { response } = await requireUser(request);
  if (response) return response;

  await clearSession();
  return jsonNoStore({ ok: true });
}
