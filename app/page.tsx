import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { env } from "@/lib/env";
import { getSettings, listNodes, listRules, listSubscriptionConfigs } from "@/lib/db";
import Dashboard from "@/app/ui/Dashboard";
import LoginForm from "@/app/ui/LoginForm";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ login?: string }> }) {
  const params = await searchParams;
  const authed = await isAuthenticated();
  if (!authed && params.login !== "1") {
    redirect("/?login=1");
  }
  if (!authed) return <LoginForm />;

  const configs = listSubscriptionConfigs();
  const activeConfig = configs[0];

  return (
    <Dashboard
      initialConfigs={configs}
      initialNodes={listNodes(activeConfig.id)}
      initialRules={listRules(activeConfig.id)}
      initialSettings={getSettings(activeConfig.id)}
      subscriptionBaseUrl={`${env.baseUrl}/sub`}
    />
  );
}
