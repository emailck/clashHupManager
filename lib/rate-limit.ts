import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/security";

const windowMs = 10 * 60 * 1000;
const maxFailedAttempts = 10;

type Bucket = { failed: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function checkLoginRateLimit(request: NextRequest) {
  const now = Date.now();
  const key = clientIp(request);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { failed: 0, resetAt: now + windowMs });
    return null;
  }

  if (bucket.failed >= maxFailedAttempts) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return jsonNoStore(
      { error: "请求过于频繁，请稍后再试" },
      { status: 429, headers: { "retry-after": String(retryAfter) } },
    );
  }
  return null;
}

export function recordLoginFailure(request: NextRequest) {
  const now = Date.now();
  const key = clientIp(request);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { failed: 1, resetAt: now + windowMs });
    return;
  }
  bucket.failed += 1;
}

export function clearLoginFailures(request: NextRequest) {
  buckets.delete(clientIp(request));
}
