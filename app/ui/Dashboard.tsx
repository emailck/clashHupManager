"use client";

import { Copy, Eye, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import UserManagement from "./UserManagement";

type NodeRow = {
  id: number;
  name: string;
  uri: string;
  enabled: number;
  sort_order: number;
};

type RuleRow = {
  id: number;
  list_type: string;
  value: string;
  enabled: number;
  sort_order: number;
};

type SubscriptionConfig = {
  id: number;
  name: string;
  token: string;
};

type CurrentUser = {
  username: string;
  role: "admin" | "user";
};

type Props = {
  initialConfigs: SubscriptionConfig[];
  initialNodes: NodeRow[];
  initialRules: RuleRow[];
  initialSettings: Record<string, string>;
  subscriptionBaseUrl: string;
  currentUser?: CurrentUser | null;
};

export default function Dashboard({ initialConfigs, initialNodes, initialRules, initialSettings, subscriptionBaseUrl, currentUser = null }: Props) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [activeConfigId, setActiveConfigId] = useState(initialConfigs[0].id);
  const [nodes, setNodes] = useState(initialNodes);
  const [rules, setRules] = useState(initialRules);
  const [settings, setSettings] = useState(initialSettings);
  const [nodeUri, setNodeUri] = useState("");
  const [ruleTab, setRuleTab] = useState<"proxy" | "direct">("proxy");
  const [ruleText, setRuleText] = useState("");
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");
  const [configName, setConfigName] = useState(initialConfigs[0].name);

  const activeConfig = configs.find((config) => config.id === activeConfigId) || configs[0];
  const subscriptionUrl = `${subscriptionBaseUrl}/${activeConfig.token}.yaml`;

  const enabledNodeNames = useMemo(() => nodes.filter((node) => node.enabled).map((node) => node.name), [nodes]);
  const currentRules = rules.filter((rule) => rule.list_type === ruleTab);
  const baseOptions = ["♻️ 自动选择", "🌐 全部节点", "DIRECT"];
  const strategyOptions = ["🚀 节点选择", ...baseOptions];
  const rejectOptions = ["REJECT", "DIRECT", "🚀 节点选择", "♻️ 自动选择", "🌐 全部节点"];
  const settingRows = [
    { key: "default_proxy", label: "🚀 节点选择", selfGroup: "" },
    { key: "default_ai", label: "🤖 AI网站", selfGroup: "🤖 AI网站" },
    { key: "default_media", label: "🎬 媒体解锁", selfGroup: "🎬 媒体解锁" },
    { key: "default_fallback", label: "🐟 漏网之鱼", selfGroup: "🐟 漏网之鱼" },
    { key: "default_reject", label: "🛑 广告拦截", selfGroup: "🛑 广告拦截" },
  ];

  async function loadConfig(configId: number) {
    const [nodeResponse, ruleResponse, settingsResponse] = await Promise.all([
      fetch(`/api/nodes?configId=${configId}`),
      fetch(`/api/rules?configId=${configId}`),
      fetch(`/api/settings?configId=${configId}`),
    ]);
    if (nodeResponse.ok) setNodes((await nodeResponse.json()).nodes);
    if (ruleResponse.ok) setRules((await ruleResponse.json()).rules);
    if (settingsResponse.ok) setSettings((await settingsResponse.json()).settings);
  }

  async function selectConfig(configId: number) {
    const config = configs.find((item) => item.id === configId);
    if (!config) return;
    setActiveConfigId(configId);
    setConfigName(config.name);
    setPreview("");
    await loadConfig(configId);
  }

  async function refreshAll() {
    const response = await fetch("/api/configs");
    if (response.ok) {
      const nextConfigs = (await response.json()).configs as SubscriptionConfig[];
      setConfigs(nextConfigs);
      const nextConfig = nextConfigs.find((config) => config.id === activeConfigId) || nextConfigs[0];
      setActiveConfigId(nextConfig.id);
      setConfigName(nextConfig.name);
      await loadConfig(nextConfig.id);
      return;
    }
    await loadConfig(activeConfigId);
  }

  async function createConfig() {
    const response = await fetch("/api/configs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: configName }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "新增配置失败");
      return;
    }
    setConfigs(data.configs);
    setActiveConfigId(data.config.id);
    setConfigName(data.config.name);
    await loadConfig(data.config.id);
    setPreview("");
    setMessage("订阅配置已创建");
  }

  async function renameConfig() {
    const response = await fetch(`/api/configs/${activeConfigId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: configName }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "保存配置名称失败");
      return;
    }
    setConfigs(data.configs);
    setConfigName(data.config.name);
    setMessage("配置名称已保存");
  }

  async function deleteConfig() {
    if (!window.confirm(`删除“${activeConfig.name}”及其节点和规则？`)) return;
    const response = await fetch(`/api/configs/${activeConfigId}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "删除配置失败");
      return;
    }
    setConfigs(data.configs);
    await selectConfig(data.configs[0].id);
    setMessage("订阅配置已删除");
  }

  async function addNode() {
    const response = await fetch("/api/nodes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ uri: nodeUri, configId: activeConfigId }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "添加节点失败");
      return;
    }
    setNodes(data.nodes);
    setNodeUri("");
    setMessage(`已保存 ${data.added || 1} 个节点${data.errors?.length ? `，${data.errors.length} 个失败` : ""}`);
  }

  async function deleteNode(id: number) {
    const response = await fetch(`/api/nodes/${id}?configId=${activeConfigId}`, { method: "DELETE" });
    if (response.ok) setNodes((await response.json()).nodes);
  }

  async function toggleNode(node: NodeRow) {
    const response = await fetch(`/api/nodes/${node.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: !node.enabled, configId: activeConfigId }),
    });
    if (response.ok) setNodes((await response.json()).nodes);
  }

  async function addRules() {
    const response = await fetch("/api/rules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ list_type: ruleTab, value: ruleText, configId: activeConfigId }),
    });
    if (response.ok) {
      setRules((await response.json()).rules);
      setRuleText("");
    }
  }

  async function deleteRule(id: number) {
    const response = await fetch(`/api/rules/${id}?configId=${activeConfigId}`, { method: "DELETE" });
    if (response.ok) setRules((await response.json()).rules);
  }

  async function saveSettings(nextSettings = settings) {
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...nextSettings, configId: activeConfigId }),
    });
    if (response.ok) {
      setSettings((await response.json()).settings);
      setMessage("默认分组已保存");
    }
  }

  async function loadPreview() {
    const response = await fetch(`/api/preview?configId=${activeConfigId}`);
    setPreview(await response.text());
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/?login=1";
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">Clash Sub Manager</div>
        <div className="row">
          {currentUser ? <span className="muted">{currentUser.username}</span> : null}
          <button title="刷新" onClick={refreshAll}><RefreshCw size={16} /></button>
          <button onClick={logout}>退出</button>
        </div>
      </header>

      <section className="workspace">
        <div className="stack">
          <section className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">订阅配置</div>
                <div className="muted">每份配置独立保存节点、规则和默认策略</div>
              </div>
              <button className="danger" title="删除当前配置" onClick={deleteConfig} disabled={configs.length === 1}><Trash2 size={16} /></button>
            </div>
            <div className="panel-body stack">
              <select value={activeConfigId} onChange={(event) => selectConfig(Number(event.target.value))}>
                {configs.map((config) => <option key={config.id} value={config.id}>{config.name}</option>)}
              </select>
              <div className="row">
                <input value={configName} onChange={(event) => setConfigName(event.target.value)} placeholder="订阅配置名称" />
                <button title="保存配置名称" onClick={renameConfig}><Save size={16} /></button>
                <button className="primary" title="新增订阅配置" onClick={createConfig}><Plus size={16} /></button>
              </div>
            </div>
          </section>

          {currentUser?.role === "admin" ? <UserManagement /> : null}

          <section className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">订阅链接</div>
                <div className="muted">Clash Verge 远程订阅地址</div>
              </div>
              <button title="复制" onClick={() => navigator.clipboard.writeText(subscriptionUrl)}><Copy size={16} /></button>
            </div>
            <div className="panel-body">
              <div className="mono">{subscriptionUrl}</div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">节点</div>
                <div className="muted">粘贴 VLESS Reality 链接会自动解析名称</div>
              </div>
            </div>
            <div className="panel-body stack">
              <textarea value={nodeUri} onChange={(event) => setNodeUri(event.target.value)} placeholder={"vless://...\n支持一次粘贴多个节点，每行一个"} />
              <div className="row">
                <button className="primary" onClick={addNode}><Plus size={16} /> 添加节点</button>
                {message ? <span className="muted">{message}</span> : null}
              </div>
              <div className="list">
                {nodes.map((node) => (
                  <div className="item" key={node.id}>
                    <div>
                      <div className="item-name">{node.name}{node.enabled ? "" : "（已停用）"}</div>
                      <div className="item-uri">{node.uri}</div>
                    </div>
                    <div className="row">
                      <button onClick={() => toggleNode(node)}>{node.enabled ? "停用" : "启用"}</button>
                      <button className="danger" title="删除" onClick={() => deleteNode(node.id)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">默认策略</div>
                <div className="muted">控制生成后的分组默认顺序</div>
              </div>
              <button onClick={() => saveSettings()}>保存</button>
            </div>
            <div className="panel-body grid2">
              {settingRows.map(({ key, label, selfGroup }) => (
                <label className="stack" key={key}>
                  <span className="muted">{label}</span>
                  <select value={settings[key] || ""} onChange={(event) => setSettings({ ...settings, [key]: event.target.value })}>
                    <option value="">{key === "default_reject" ? "默认使用 REJECT" : "自动使用第一个节点"}</option>
                    {(key === "default_reject" ? rejectOptions : key === "default_proxy" ? baseOptions : strategyOptions)
                      .filter((option) => option !== selfGroup)
                      .map((option) => <option key={option} value={option}>{option}</option>)}
                    {enabledNodeNames.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">自定义规则</div>
                <div className="muted">写 classical 规则，例如 DOMAIN-SUFFIX,linux.do</div>
              </div>
            </div>
            <div className="panel-body stack">
              <div className="tabs">
                <button className={ruleTab === "proxy" ? "tab-active" : ""} onClick={() => setRuleTab("proxy")}>强制代理</button>
                <button className={ruleTab === "direct" ? "tab-active" : ""} onClick={() => setRuleTab("direct")}>强制直连</button>
              </div>
              <textarea value={ruleText} onChange={(event) => setRuleText(event.target.value)} placeholder={"DOMAIN-SUFFIX,example.com\nDOMAIN,api.example.com"} />
              <button className="primary" onClick={addRules}><Plus size={16} /> 添加规则</button>
              <div className="list">
                {currentRules.map((rule) => (
                  <div className="item" key={rule.id}>
                    <div className="mono">{rule.value}</div>
                    <button className="danger" title="删除" onClick={() => deleteRule(rule.id)}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">YAML 预览</div>
              <div className="muted">基于 qichiyu 风格模板实时生成</div>
            </div>
            <button title="预览" onClick={loadPreview}><Eye size={16} /></button>
          </div>
          <div className="panel-body">
            <pre className="preview">{preview || "点击预览按钮生成订阅 YAML"}</pre>
          </div>
        </aside>
      </section>
    </main>
  );
}
