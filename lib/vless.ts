export type ClashProxy = Record<string, unknown>;

export function parseVlessUri(uri: string): ClashProxy {
  const parsed = new URL(uri);
  if (parsed.protocol !== "vless:") {
    throw new Error("Only vless:// links are supported in this MVP.");
  }

  const params = parsed.searchParams;
  const name = decodeURIComponent(parsed.hash.replace(/^#/, "")) || parsed.hostname;
  const security = params.get("security");
  const network = params.get("type") || "tcp";
  const shortId = params.get("sid") || undefined;
  const publicKey = params.get("pbk") || undefined;
  const spiderX = params.get("spx") || undefined;

  const proxy: ClashProxy = {
    name,
    type: "vless",
    server: parsed.hostname,
    port: Number(parsed.port || 443),
    uuid: parsed.username,
    network,
    udp: true,
  };

  if (params.get("flow")) proxy.flow = params.get("flow");
  if (security === "reality" || security === "tls") {
    proxy.tls = true;
  }
  if (params.get("sni")) proxy.servername = params.get("sni");
  if (params.get("fp")) proxy["client-fingerprint"] = params.get("fp");

  if (security === "reality") {
    proxy["reality-opts"] = {
      ...(publicKey ? { "public-key": publicKey } : {}),
      ...(shortId ? { "short-id": shortId } : {}),
      ...(spiderX ? { "spider-x": spiderX } : {}),
    };
  }

  return proxy;
}
