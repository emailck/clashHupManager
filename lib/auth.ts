import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { db, getUserByUsername, hashUserPassword, type UserRole } from "@/lib/db";
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

export type CurrentUser = {
  id: number;
  username: string;
  role: UserRole;
};

function verifyPasswordHash(password: string, passwordHash: string) {
  const [algorithm, salt, expected] = passwordHash.split("$");
  if (algorithm !== "scrypt" || !salt || !expected) return false;

  try {
    const actual = scryptSync(password, salt, 64).toString("base64url");
    return constantTimeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function hashPassword(password: string) {
  return hashUserPassword(password);
}

export function verifyUserPassword(username: string, password: string): CurrentUser | null {
  const user = getUserByUsername(username);
  if (!user || !user.enabled || !verifyPasswordHash(password, user.password_hash)) return null;
  return { id: user.id, username: user.username, role: user.role };
}

export async function createSession(userId: number) {
  purgeExpiredSessions();
  const token = randomBytes(32).toString("base64url");
  db.prepare("insert into sessions (token_hash, user_id, expires_at) values (?, ?, ?)").run(
    hmac(token),
    userId,
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
  return Boolean(await getCurrentUser());
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  purgeExpiredSessions();
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (!token) return null;

  const user = db.prepare(`
    select users.id, users.username, users.role
    from sessions join users on users.id = sessions.user_id
    where sessions.token_hash = ? and sessions.expires_at > ? and users.enabled = 1
  `).get(hmac(token), Date.now()) as CurrentUser | undefined;
  return user || null;
}

export function checkPassword(password: string) {
  return Boolean(verifyUserPassword("admin", password));
}
