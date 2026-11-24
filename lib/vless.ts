export type ClashProxy = Record<string, unknown>;

// Mirrors Go strconv.ParseBool, which Mihomo uses for share-link options.
function parseBoolParam(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  if (["1", "t", "T", "TRUE", "true", "True"].includes(value)) return true;
  if (["0", "f", "F", "FALSE", "false", "False"].includes(value)) return false;
  return undefined;
}

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
    const mlkem768 = parseBoolParam(params.get("support-x25519mlkem768"));
    proxy["reality-opts"] = {
      ...(publicKey ? { "public-key": publicKey } : {}),
      ...(shortId ? { "short-id": shortId } : {}),
      ...(spiderX ? { "spider-x": spiderX } : {}),
      ...(mlkem768 !== undefined ? { "support-x25519mlkem768": mlkem768 } : {}),
    };
  }

  return proxy;
}
