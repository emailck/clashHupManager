import { db, listNodes } from "@/lib/db";
import { fetchSubscription, validateSubscriptionUrl } from "@/lib/subscription-fetch";
import { formatSubscriptionInfo, parseSubscriptionBody, parseSubscriptionInfo } from "@/lib/node-uri";

type SourceRow = { id: number; config_id: number; url: string; userinfo: string; updated_at: string };

export function listSubscriptionSources(configId: number) {
  return db.prepare("select * from subscription_sources where config_id = ? order by id").all(configId) as SourceRow[];
}

export function subscriptionSourcesView(configId: number) {
  return listSubscriptionSources(configId).map(({ userinfo, ...source }) => ({ ...source, info: parseSubscriptionInfo(userinfo) }));
}

export function subscriptionUserinfo(configId: number) {
  const sources = listSubscriptionSources(configId);
  // Distinct upstream plans cannot be represented by one truthful quota/expiry.
  return sources.length === 1 ? sources[0].userinfo : "";
}

export async function importSubscription(configId: number, value: string) {
  const url = validateSubscriptionUrl(value).href;
  const result = await fetchSubscription(url);
  const nodes = parseSubscriptionBody(result.body);
  const userinfo = formatSubscriptionInfo(parseSubscriptionInfo(result.userinfo));
  return db.transaction(() => {
    // The configuration can have been removed while the upstream was downloading.
    if (!db.prepare("select id from subscription_configs where id = ?").get(configId)) throw new Error("配置不存在");
    db.prepare(`insert into subscription_sources (config_id, url, userinfo) values (?, ?, ?)
      on conflict(config_id, url) do update set userinfo = excluded.userinfo, updated_at = current_timestamp`).run(configId, url, userinfo);
    const source = db.prepare("select * from subscription_sources where config_id = ? and url = ?").get(configId, url) as SourceRow;
    const previous = listNodes(configId).filter((node) => node.source_id === source.id);
    const allNodes = listNodes(configId);
    const existingNames = new Set(allNodes.filter((node) => node.source_id !== source.id).map((node) => node.name));
    let order = Math.max(0, ...allNodes.map((node) => node.sort_order));
    db.prepare("delete from nodes where config_id = ? and source_id = ?").run(configId, source.id);
    const insert = db.prepare("insert into nodes (id, name, uri, enabled, sort_order, config_id, source_id) values (?, ?, ?, ?, ?, ?, ?)");
    const usedIds = new Set<number>();
    for (const node of nodes) {
      const old = previous.find((item) => !usedIds.has(item.id) && item.uri === node.uri);
      if (old) usedIds.add(old.id);
      const base = old?.name || node.name;
      let name = base;
      let suffix = 2;
      while (existingNames.has(name)) name = `${base}-${suffix++}`;
      existingNames.add(name);
      order += 10;
      insert.run(old?.id ?? null, name, node.uri, old?.enabled ?? 1, old?.sort_order ?? order, configId, source.id);
    }
    return { added: nodes.length };
  })();
}

export function removeSubscription(configId: number, sourceId: number) {
  db.transaction(() => {
    db.prepare("delete from nodes where config_id = ? and source_id = ?").run(configId, sourceId);
    db.prepare("delete from subscription_sources where config_id = ? and id = ?").run(configId, sourceId);
  })();
}
