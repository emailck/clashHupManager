import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { generateConfigYaml } from "@/lib/generator";

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return new NextResponse(generateConfigYaml(), {
    headers: { "content-type": "text/yaml; charset=utf-8" },
  });
}
