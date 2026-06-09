import { NextResponse } from "next/server";
import { generateRuleList } from "@/lib/generator";

export async function GET(_request: Request, context: { params: Promise<{ type: string }> }) {
  const { type } = await context.params;
  const listType = type.replace(/\.list$/i, "");
  if (listType !== "proxy" && listType !== "direct") {
    return new NextResponse("not found", { status: 404 });
  }
  return new NextResponse(generateRuleList(listType), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
