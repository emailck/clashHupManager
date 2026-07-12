import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { env } from "@/lib/env";
import { getSettings, listNodes, listRules } from "@/lib/db";
import { parseVlessUri } from "@/lib/vless";

type Config = Record<string, any>;

const managedGroups = new Set([
  "🚀 节点选择",
  "🤖 AI网站",
  "🎬 媒体解锁",
  "♻️ 自动选择",
  "🛑 广告拦截",
  "🌐 全部节点",
]);

function unique(values: string[]) {
  return values.filter((value, index) => value && values.indexOf(value) === index);
}

function loadTemplate(): Config {
  const templatePath = path.join(process.cwd(), "templates", "qichiyu-mihomo.yaml");
  return yaml.load(fs.readFileSync(templatePath, "utf8")) as Config;
}

function setRuleProviderUrls(config: Config, token: string) {
  if (!config["rule-providers"]) return;
  const cacheKey = token.slice(0, 10);
  if (config["rule-providers"].my_proxy) {
    config["rule-providers"].my_proxy.url = `${env.baseUrl}/rules/proxy.list?token=${encodeURIComponent(token)}&v=${cacheKey}`;
    config["rule-providers"].my_proxy.path = `./ruleset/csm_my_proxy_${cacheKey}.list`;
  }
  if (config["rule-providers"].my_direct) {
    config["rule-providers"].my_direct.url = `${env.baseUrl}/rules/direct.list?token=${encodeURIComponent(token)}&v=${cacheKey}`;
    config["rule-providers"].my_direct.path = `./ruleset/csm_my_direct_${cacheKey}.list`;
  }
}

export function generateConfigYaml(configId: number, token: string) {
  const config = loadTemplate();
  const enabledNodes = listNodes(configId).filter((node) => node.enabled);
  const settings = getSettings(configId);
  const proxies = enabledNodes.map((node) => ({ ...parseVlessUri(node.uri), name: node.name }));
  const nodeNames = proxies.map((proxy) => String(proxy.name));
  const defaultProxy = settings.default_proxy || nodeNames[0] || "DIRECT";
  const defaultAi = settings.default_ai || defaultProxy;
  const defaultMedia = settings.default_media || defaultProxy;
  const fallback = settings.default_fallback || "🚀 节点选择";
  const defaultReject = settings.default_reject || "REJECT";
  const strategyChoices = ["🚀 节点选择", "♻️ 自动选择", "🌐 全部节点", ...nodeNames, "DIRECT"];
  const rejectChoices = ["REJECT", "DIRECT", "🚀 节点选择", "♻️ 自动选择", "🌐 全部节点", ...nodeNames];

  config.proxies = proxies;

  for (const group of config["proxy-groups"] || []) {
    if (!group?.name || !managedGroups.has(group.name)) continue;
    if (group.name === "🚀 节点选择") {
      group.proxies = unique([defaultProxy, ...nodeNames, "♻️ 自动选择", "🌐 全部节点", "DIRECT"]);
    } else if (group.name === "🤖 AI网站") {
      group.proxies = unique([defaultAi, ...strategyChoices]);
    } else if (group.name === "🎬 媒体解锁") {
      group.proxies = unique([defaultMedia, ...strategyChoices]);
    } else if (group.name === "♻️ 自动选择") {
      group.proxies = nodeNames;
    } else if (group.name === "🛑 广告拦截") {
      group.proxies = unique([defaultReject, ...rejectChoices]);
    } else if (group.name === "🌐 全部节点") {
      group.proxies = nodeNames;
    }
  }

  const fallbackGroup = (config["proxy-groups"] || []).find((group: any) => group.name === "🐟 漏网之鱼");
  if (fallbackGroup) fallbackGroup.proxies = unique([fallback, "🚀 节点选择", "DIRECT"]);

  const groups = config["proxy-groups"] || [];
  if (!groups.some((group: any) => group?.name === "🚀节点选择")) {
    groups.push({
      name: "🚀节点选择",
      type: "select",
      proxies: ["🚀 节点选择"],
    });
  }

  setRuleProviderUrls(config, token);

  return yaml.dump(config, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
}

function normalizeClassicalRule(value: string) {
  const line = value.trim();
  if (!line || line.startsWith("#")) return line;

  const parts = line.split(",").map((part) => part.trim());
  if (parts.length < 3) return line;

  const policyAliases = new Set([
    "🚀节点选择", "🚀 节点选择", "🤖AI网站", "🤖 AI网站", "🎬媒体解锁", "🎬 媒体解锁",
    "🐟漏网之鱼", "🐟 漏网之鱼", "🛑广告拦截", "🛑 广告拦截", "♻️自动选择",
    "♻️ 自动选择", "🌐全部节点", "🌐 全部节点", "DIRECT", "REJECT",
  ]);
  const last = parts[parts.length - 1];
  return policyAliases.has(last) ? parts.slice(0, -1).join(",") : parts.join(",");
}

export function generateRuleList(configId: number, type: "proxy" | "direct") {
  return listRules(configId)
    .filter((rule) => rule.enabled && rule.list_type === type)
    .map((rule) => normalizeClassicalRule(rule.value))
    .filter(Boolean)
    .join("\n") + "\n";
}
