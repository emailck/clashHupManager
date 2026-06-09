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

function setRuleProviderUrls(config: Config) {
  if (!config["rule-providers"]) return;
  if (config["rule-providers"].my_proxy) {
    config["rule-providers"].my_proxy.url = `${env.baseUrl}/rules/proxy.list`;
  }
  if (config["rule-providers"].my_direct) {
    config["rule-providers"].my_direct.url = `${env.baseUrl}/rules/direct.list`;
  }
}

export function generateConfigYaml() {
  const config = loadTemplate();
  const enabledNodes = listNodes().filter((node) => node.enabled);
  const settings = getSettings();
  const proxies = enabledNodes.map((node) => parseVlessUri(node.uri));
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

  setRuleProviderUrls(config);

  return yaml.dump(config, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
}

export function generateRuleList(type: "proxy" | "direct") {
  return listRules()
    .filter((rule) => rule.enabled && rule.list_type === type)
    .map((rule) => rule.value.trim())
    .filter(Boolean)
    .join("\n") + "\n";
}
