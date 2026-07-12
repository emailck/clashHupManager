import { generateConfigYaml } from "@/lib/generator";
import { getSubscriptionConfig } from "@/lib/db";
import { requireUser, textNoStore } from "@/lib/security";

export async function GET(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  const configId = Number(new URL(request.url).searchParams.get("configId"));
  const config = Number.isInteger(configId) ? getSubscriptionConfig(configId, user.id) : undefined;
  if (!config) return textNoStore("not found", { status: 404 });
  return textNoStore(generateConfigYaml(config.id, config.token), {
    headers: { "content-type": "text/yaml; charset=utf-8" },
  });
}
