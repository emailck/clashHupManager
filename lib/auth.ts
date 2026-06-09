import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const cookieName = "csm_session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

function hmac(value: string) {
  return createHmac("sha256", env.sessionSecret).update(value).digest("hex");
}

function purgeExpiredSessions(now = Date.now()) {
  db.prepare("delete from sessions where expires_at <= ?").run(now);
}

export function constantTimeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

export async function createSession() {
  purgeExpiredSessions();
  const token = randomBytes(32).toString("base64url");
  db.prepare("insert into sessions (token_hash, expires_at) values (?, ?)").run(
    hmac(token),
    Date.now() + sessionMaxAgeSeconds * 1000,
  );

  const jar = await cookies();
  jar.set(cookieName, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds,
  });
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) db.prepare("delete from sessions where token_hash = ?").run(hmac(token));
  jar.delete(cookieName);
}

export async function isAuthenticated() {
  purgeExpiredSessions();
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (!token) return false;

  const session = db.prepare("select expires_at from sessions where token_hash = ?").get(hmac(token)) as { expires_at: number } | undefined;
  return Boolean(session && session.expires_at > Date.now());
}

export function checkPassword(password: string) {
  return constantTimeEqual(password, env.adminPassword);
}
