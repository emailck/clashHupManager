import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { getSettings, listNodes, listRules, listSubscriptionConfigs } from "@/lib/db";
import Dashboard from "@/app/ui/Dashboard";
import LoginForm from "@/app/ui/LoginForm";
import { subscriptionSourcesView } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ login?: string }> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user && params.login !== "1") {
    redirect("/?login=1");
  }
  if (!user) return <LoginForm />;

  const configs = listSubscriptionConfigs(user.id);
  const activeConfig = configs[0];

  return (
    <Dashboard
      initialConfigs={configs}
      initialNodes={listNodes(activeConfig.id)}
      initialSources={subscriptionSourcesView(activeConfig.id)}
      initialRules={listRules(activeConfig.id)}
      initialSettings={getSettings(activeConfig.id)}
      subscriptionBaseUrl={`${env.baseUrl}/sub`}
      currentUser={user}
    />
  );
}
