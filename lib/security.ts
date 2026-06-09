import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
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

export async function requireAdmin(request?: NextRequest) {
  if (!(await isAuthenticated())) return jsonNoStore({ error: "unauthorized" }, { status: 401 });
  if (request) return requireSameOrigin(request);
  return null;
}
