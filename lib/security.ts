import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { env } from "@/lib/env";

export const noStoreHeaders = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

export function jsonNoStore(body: unknown, init: ResponseInit = {}) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...noStoreHeaders,
      ...(init.headers || {}),
    },
  });
}

export function textNoStore(body: BodyInit | null, init: ResponseInit = {}) {
  return new NextResponse(body, {
    ...init,
    headers: {
      ...noStoreHeaders,
      ...(init.headers || {}),
    },
  });
}

export function hasValidOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const allowedOrigins = new Set<string>([request.nextUrl.origin, new URL(env.baseUrl).origin]);
  try {
    return allowedOrigins.has(new URL(origin).origin);
  } catch {
    return false;
  }
}

export function requireSameOrigin(request: NextRequest) {
  if (!hasValidOrigin(request)) return jsonNoStore({ error: "forbidden" }, { status: 403 });
  return null;
}

export type UserGuard =
  | { user: CurrentUser; response: null }
  | { user: null; response: NextResponse };

export async function requireUser(request?: NextRequest): Promise<UserGuard> {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: jsonNoStore({ error: "unauthorized" }, { status: 401 }) };

  const originError = request && requireSameOrigin(request);
  if (originError) return { user: null, response: originError };
  return { user, response: null };
}

export async function requireAdmin(request?: NextRequest): Promise<UserGuard> {
  const guard = await requireUser(request);
  if (guard.response) return guard;
  if (guard.user.role !== "admin") return { user: null, response: jsonNoStore({ error: "forbidden" }, { status: 403 }) };
  return guard;
}
