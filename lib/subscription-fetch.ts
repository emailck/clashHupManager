import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP } from "node:net";

const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(address, prefix, "ipv4");
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
for (const [address, prefix] of [["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20]] as const) {
  blocked.addSubnet(address, prefix, "ipv6");
}

export function isPublicAddress(address: string) {
  const family = isIP(address);
  return family === 4 ? !blocked.check(address, "ipv4")
    : family === 6 && globalV6.check(address, "ipv6") && !blocked.check(address, "ipv6");
}

export function validateSubscriptionUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("订阅地址无效"); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || value.length > 4096) {
    throw new Error("请使用不含用户名密码的 HTTP(S) 订阅地址");
  }
  url.hash = "";
  return url;
}

export async function fetchSubscription(value: string) {
  let url = validateSubscriptionUrl(value);
  const signal = AbortSignal.timeout(15000);
  try {
    for (let redirects = 0; redirects <= 3; redirects++) {
      const hostname = url.hostname.replace(/^\[|\]$/g, "");
      const addresses = await Promise.race([
        lookup(hostname, { all: true }),
        new Promise<never>((_, reject) => {
          if (signal.aborted) reject(new Error("timeout"));
          else signal.addEventListener("abort", () => reject(new Error("timeout")), { once: true });
        }),
      ]);
      if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
        throw new Error("订阅地址必须指向公网服务器");
      }
      const target = addresses[0];
      const result = await new Promise<{ location?: string; body: string; userinfo: string | null }>((resolve, reject) => {
        const request = (url.protocol === "https:" ? https : http).get(url, {
          signal,
          agent: false,
          family: target.family,
          lookup: (_hostname, _options, callback) => callback(null, target.address, target.family),
          headers: { "user-agent": "clash-verge/v2.4.0", accept: "text/plain", "accept-encoding": "identity" },
        }, (response) => {
          if ([301, 302, 303, 307, 308].includes(response.statusCode || 0) && response.headers.location) {
            response.destroy();
            resolve({ location: response.headers.location, body: "", userinfo: null });
            return;
          }
          if (response.statusCode !== 200) {
            response.destroy();
            reject(new Error("upstream status"));
            return;
          }
          const chunks: Buffer[] = [];
          let size = 0;
          response.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > 2 * 1024 * 1024) {
              response.destroy(new Error("订阅内容超过 2 MiB 限制"));
              return;
            }
            chunks.push(chunk);
          });
          response.on("error", reject);
          response.on("end", () => resolve({
            body: Buffer.concat(chunks).toString("utf8"),
            userinfo: typeof response.headers["subscription-userinfo"] === "string" ? response.headers["subscription-userinfo"] : null,
          }));
        });
        request.on("error", reject);
      });
      if (!result.location) return result;
      const next = validateSubscriptionUrl(new URL(result.location, url).href);
      if (url.protocol === "https:" && next.protocol !== "https:") throw new Error("禁止订阅重定向降级为 HTTP");
      url = next;
    }
    throw new Error("订阅重定向次数过多");
  } catch (error) {
    if (error instanceof Error && /^(订阅地址必须|订阅内容超过|禁止订阅|订阅重定向)/.test(error.message)) throw error;
    throw new Error("获取订阅失败，请检查地址、证书和网络连接后重试");
  }
}
