import { NextRequest } from "next/server";
import { constantTimeEqual } from "@/lib/auth";
import { getSubscriptionConfigByToken } from "@/lib/db";
import { generateRuleList } from "@/lib/generator";
import { textNoStore } from "@/lib/security";

export async function GET(request: NextRequest, context: { params: Promise<{ type: string }> }) {
  const suppliedToken = request.nextUrl.searchParams.get("token") || "";
  const config = getSubscriptionConfigByToken(suppliedToken);
  if (!config || !constantTimeEqual(suppliedToken, config.token)) {
    return textNoStore("not found", { status: 404 });
  }

  const { type } = await context.params;
  const listType = type.replace(/\.list$/i, "");
  if (listType !== "proxy" && listType !== "direct") {
    return textNoStore("not found", { status: 404 });
  }
  return textNoStore(generateRuleList(config.id, listType), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
