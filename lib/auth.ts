import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

const cookieName = "csm_session";

function sign(value: string) {
  return createHash("sha256").update(`${value}:${env.sessionSecret}`).digest("hex");
}

export async function createSession() {
  const value = sign(env.adminPassword);
  const jar = await cookies();
  jar.set(cookieName, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(cookieName);
}

export async function isAuthenticated() {
  const jar = await cookies();
  const session = jar.get(cookieName)?.value || "";
  const expected = sign(env.adminPassword);
  const sessionBuffer = Buffer.from(session);
  const expectedBuffer = Buffer.from(expected);
  return sessionBuffer.length === expectedBuffer.length && timingSafeEqual(sessionBuffer, expectedBuffer);
}

export function checkPassword(password: string) {
  return password === env.adminPassword;
}
