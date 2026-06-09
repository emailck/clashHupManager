import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("referrer-policy", "same-origin");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");

  if (request.nextUrl.pathname.startsWith("/api/") || request.nextUrl.pathname.startsWith("/sub/")) {
    response.headers.set("cache-control", "no-store");
  }

  return response;
}
