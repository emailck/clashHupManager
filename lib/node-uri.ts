import { parseVlessUri, type ClashProxy } from "./vless";

export function splitNodeUris(value: string) {
  return value.split(/\r?\n/).flatMap((line) => line.split(/(?=(?:vless|hysteria2|hy2):\/\/)/g))
    .map((line) => line.trim()).filter(Boolean);
}

export function parseNodeUri(uri: string): ClashProxy {
  const url = new URL(uri);
  if (!url.hostname || !url.username || (url.port && (Number(url.port) < 1 || Number(url.port) > 65535))) {
    throw new Error("节点地址、端口或凭据无效");
  }
  if (url.protocol === "vless:") return parseVlessUri(uri);
  if (url.protocol !== "hysteria2:" && url.protocol !== "hy2:") {
    throw new Error("仅支持 VLESS 和 Hysteria2 节点");
  }
  const params = url.searchParams;
  const proxy: ClashProxy = {
    name: decodeURIComponent(url.hash.slice(1)) || url.hostname,
    type: "hysteria2",
    server: url.hostname.replace(/^\[|\]$/g, ""),
    port: Number(url.port || 443),
    password: decodeURIComponent(url.username + (url.password ? `:${url.password}` : "")),
  };
  if (params.get("sni")) proxy.sni = params.get("sni");
  if (params.get("alpn")) proxy.alpn = params.get("alpn")!.split(",");
  if (params.has("insecure")) proxy["skip-cert-verify"] = ["1", "true"].includes(params.get("insecure")!);
  if (params.get("obfs")) {
    if (params.get("obfs") !== "salamander" || !params.get("obfs-password")) throw new Error("Hysteria2 混淆参数无效");
    proxy.obfs = "salamander";
    proxy["obfs-password"] = params.get("obfs-password");
  }
  if (params.get("pinSHA256")) proxy.fingerprint = params.get("pinSHA256");
  if (params.get("mport")) proxy.ports = params.get("mport");
  return proxy;
}

export function parseSubscriptionBody(body: string) {
  let content = body.trim();
  if (/^[A-Za-z0-9+/_=\s-]+$/.test(content)) {
    content = Buffer.from(content.replace(/\s/g, ""), "base64").toString("utf8").trim();
  }
  const uris = [...new Set(splitNodeUris(content))];
  if (!uris.length || uris.length > 2000) throw new Error("订阅节点数量必须在 1 到 2000 之间");
  return uris.map((uri, index) => {
    try {
      return { uri, name: String(parseNodeUri(uri).name) };
    } catch {
      throw new Error(`订阅中第 ${index + 1} 个节点无法解析；目前支持明文或 Base64 编码的 VLESS / Hysteria2 链接列表`);
    }
  });
}

export type SubscriptionInfo = { upload?: number; download?: number; total?: number; expire?: number };

export function parseSubscriptionInfo(header: string | null): SubscriptionInfo {
  const info: SubscriptionInfo = {};
  for (const field of (header || "").split(";")) {
    const match = field.trim().match(/^(upload|download|total|expire)=(\d+)$/);
    if (match && Number.isSafeInteger(Number(match[2]))) info[match[1] as keyof SubscriptionInfo] = Number(match[2]);
  }
  return info;
}

export function formatSubscriptionInfo(info: SubscriptionInfo) {
  return (["upload", "download", "total", "expire"] as const)
    .filter((key) => info[key] !== undefined).map((key) => `${key}=${info[key]}`).join("; ");
}
