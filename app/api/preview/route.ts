import { generateConfigYaml } from "@/lib/generator";
import { requireAdmin, textNoStore } from "@/lib/security";

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;
  return textNoStore(generateConfigYaml(), {
    headers: { "content-type": "text/yaml; charset=utf-8" },
  });
}
