import { constantTimeEqual } from "@/lib/auth";
import { getSubscriptionConfigByToken } from "@/lib/db";
import { generateConfigYaml } from "@/lib/generator";
import { textNoStore } from "@/lib/security";
import { subscriptionUserinfo } from "@/lib/subscriptions";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const cleanToken = token.replace(/\.ya?ml$/i, "");
  const config = getSubscriptionConfigByToken(cleanToken);
  if (!config || !constantTimeEqual(cleanToken, config.token)) {
    return textNoStore("not found", { status: 404 });
  }
  const userinfo = subscriptionUserinfo(config.id);
  return textNoStore(generateConfigYaml(config.id, config.token), {
    headers: {
      "content-type": "text/yaml; charset=utf-8",
      ...(userinfo ? { "subscription-userinfo": userinfo } : {}),
    },
  });
}
