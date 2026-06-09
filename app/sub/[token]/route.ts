import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { generateConfigYaml } from "@/lib/generator";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const cleanToken = token.replace(/\.ya?ml$/i, "");
  if (cleanToken !== env.subToken) {
    return new NextResponse("not found", { status: 404 });
  }
  return new NextResponse(generateConfigYaml(), {
    headers: {
      "content-type": "text/yaml; charset=utf-8",
      "subscription-userinfo": "upload=0; download=0; total=107374182400; expire=4102444800",
    },
  });
}
