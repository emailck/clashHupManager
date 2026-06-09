import { NextRequest } from "next/server";
import { constantTimeEqual } from "@/lib/auth";
import { env } from "@/lib/env";
import { generateRuleList } from "@/lib/generator";
import { textNoStore } from "@/lib/security";

export async function GET(request: NextRequest, context: { params: Promise<{ type: string }> }) {
  const suppliedToken = request.nextUrl.searchParams.get("token") || "";
  if (!constantTimeEqual(suppliedToken, env.subToken)) {
    return textNoStore("not found", { status: 404 });
  }

  const { type } = await context.params;
  const listType = type.replace(/\.list$/i, "");
  if (listType !== "proxy" && listType !== "direct") {
    return textNoStore("not found", { status: 404 });
  }
  return textNoStore(generateRuleList(listType), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
