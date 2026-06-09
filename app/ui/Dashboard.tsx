"use client";

import { Copy, Eye, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

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

type Props = {
  initialNodes: NodeRow[];
  initialRules: RuleRow[];
  initialSettings: Record<string, string>;
  subscriptionUrl: string;
};

export default function Dashboard({ initialNodes, initialRules, initialSettings, subscriptionUrl }: Props) {
  const [nodes, setNodes] = useState(initialNodes);
  const [rules, setRules] = useState(initialRules);
  const [settings, setSettings] = useState(initialSettings);
  const [nodeUri, setNodeUri] = useState("");
  const [ruleTab, setRuleTab] = useState<"proxy" | "direct">("proxy");
  const [ruleText, setRuleText] = useState("");
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");

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

  async function refreshAll() {
    const [nodeResponse, ruleResponse, settingsResponse] = await Promise.all([
      fetch("/api/nodes"),
      fetch("/api/rules"),
      fetch("/api/settings"),
    ]);
    if (nodeResponse.ok) setNodes((await nodeResponse.json()).nodes);
    if (ruleResponse.ok) setRules((await ruleResponse.json()).rules);
    if (settingsResponse.ok) setSettings((await settingsResponse.json()).settings);
  }

  async function addNode() {
    const response = await fetch("/api/nodes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ uri: nodeUri }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "添加节点失败");
      return;
    }
    setNodes(data.nodes);
    setNodeUri("");
    setMessage("节点已保存");
  }

  async function deleteNode(id: number) {
    const response = await fetch(`/api/nodes/${id}`, { method: "DELETE" });
    if (response.ok) setNodes((await response.json()).nodes);
  }

  async function toggleNode(node: NodeRow) {
    const response = await fetch(`/api/nodes/${node.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: !node.enabled }),
    });
    if (response.ok) setNodes((await response.json()).nodes);
  }

  async function addRules() {
    const response = await fetch("/api/rules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ list_type: ruleTab, value: ruleText }),
    });
    if (response.ok) {
      setRules((await response.json()).rules);
      setRuleText("");
    }
  }

  async function deleteRule(id: number) {
    const response = await fetch(`/api/rules/${id}`, { method: "DELETE" });
    if (response.ok) setRules((await response.json()).rules);
  }

  async function saveSettings(nextSettings = settings) {
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(nextSettings),
    });
    if (response.ok) {
      setSettings((await response.json()).settings);
      setMessage("默认分组已保存");
    }
  }

  async function loadPreview() {
    const response = await fetch("/api/preview");
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
          <button title="刷新" onClick={refreshAll}><RefreshCw size={16} /></button>
          <button onClick={logout}>退出</button>
        </div>
      </header>

      <section className="workspace">
        <div className="stack">
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
              <textarea value={nodeUri} onChange={(event) => setNodeUri(event.target.value)} placeholder="vless://..." />
              <div className="row">
                <button className="primary" onClick={addNode}><Plus size={16} /> 添加节点</button>
                {message ? <span className="muted">{message}</span> : null}
              </div>
              <div className="list">
                {nodes.map((node) => (
                  <div className="item" key={node.id}>
                    <div>
                      <div className="item-name">{node.name}</div>
                      <div className="item-uri">{node.uri}</div>
                    </div>
                    <div className="row">
                      <button onClick={() => toggleNode(node)}>{node.enabled ? "启用" : "停用"}</button>
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
