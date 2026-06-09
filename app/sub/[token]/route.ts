import { constantTimeEqual } from "@/lib/auth";
import { env } from "@/lib/env";
import { generateConfigYaml } from "@/lib/generator";
import { textNoStore } from "@/lib/security";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const cleanToken = token.replace(/\.ya?ml$/i, "");
  if (!constantTimeEqual(cleanToken, env.subToken)) {
    return textNoStore("not found", { status: 404 });
  }
  return textNoStore(generateConfigYaml(), {
    headers: {
      "content-type": "text/yaml; charset=utf-8",
      "subscription-userinfo": "upload=0; download=0; total=107374182400; expire=4102444800",
    },
  });
}
