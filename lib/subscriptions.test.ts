import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import https from "node:https";
import { PassThrough } from "node:stream";
import { EventEmitter } from "node:events";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { test } from "node:test";
import yaml from "js-yaml";
import { formatSubscriptionInfo, parseNodeUri, parseSubscriptionBody, parseSubscriptionInfo } from "./node-uri";
import { fetchSubscription, isPublicAddress, validateSubscriptionUrl } from "./subscription-fetch";

const vless = "vless://00000000-0000-0000-0000-000000000001@node.example:443?security=reality&sni=tls.example&pbk=public-key&sid=abcd&fp=chrome&type=tcp#Test";
const hy2 = "hysteria2://user%3Apassword@hy.example:8443?sni=tls.example&insecure=1&obfs=salamander&obfs-password=test&alpn=h3#Test";

test("plain and Base64 subscriptions preserve VLESS Reality and Hysteria2 settings", () => {
  const text = `${vless}\r\n${hy2}\n${vless}`;
  for (const content of [text, Buffer.from(text).toString("base64"), Buffer.from(text).toString("base64url")]) {
    const nodes = parseSubscriptionBody(content);
    assert.equal(nodes.length, 2);
    const v = parseNodeUri(nodes[0].uri);
    assert.equal(v.type, "vless");
    assert.deepEqual(v["reality-opts"], { "public-key": "public-key", "short-id": "abcd" });
    const h = parseNodeUri(nodes[1].uri);
    assert.equal(h.type, "hysteria2");
    assert.equal(h.password, "user:password");
    assert.equal(h.port, 8443);
    assert.equal(h.sni, "tls.example");
    assert.equal(h["skip-cert-verify"], true);
    assert.deepEqual(h.alpn, ["h3"]);
    assert.equal(h["obfs-password"], "test");
  }
  assert.equal(parseNodeUri(hy2.replace("hysteria2:", "hy2:")).type, "hysteria2");
  assert.throws(() => parseSubscriptionBody(`${vless}\nss://unsupported`), /第 2 个节点/);
  assert.throws(() => parseSubscriptionBody("<html>Login</html>"), /无法解析/);
  assert.throws(() => parseSubscriptionBody(""), /数量/);
});

test("userinfo keeps real values including zero, without inventing missing quota", () => {
  assert.equal(formatSubscriptionInfo(parseSubscriptionInfo("upload=0; download=22; total=100; expire=1791734400")),
    "upload=0; download=22; total=100; expire=1791734400");
  assert.deepEqual(parseSubscriptionInfo("upload=-1; download=NaN; total=999999999999999999999; expire=no"), {});
  assert.equal(formatSubscriptionInfo(parseSubscriptionInfo(null)), "");
  assert.equal(formatSubscriptionInfo(parseSubscriptionInfo("expire=1791734400")), "expire=1791734400");
});

test("upstream fetching rejects local, private, special and mapped addresses", async () => {
  for (const address of ["127.0.0.1", "10.1.1.1", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "::ffff:127.0.0.1", "fd00::1", "fe80::1", "2002:7f00:1::", "2001:db8::1"]) {
    assert.equal(isPublicAddress(address), false, address);
  }
  assert.equal(isPublicAddress("8.8.8.8"), true);
  assert.equal(isPublicAddress("2606:4700:4700::1111"), true);
  assert.throws(() => validateSubscriptionUrl("file:///etc/passwd"));
  assert.throws(() => validateSubscriptionUrl("https://user:pass@example.com/sub"));
  await assert.rejects(fetchSubscription("http://127.0.0.1/sub"), /公网/);
});

test("subscription persistence, refresh, isolation, YAML and response headers", async (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), "clash-sub-test-"));
  process.env.DATABASE_PATH = path.join(directory, "app.db");
  // Next.js imports database-backed routes concurrently during build/startup.
  await Promise.all(Array.from({ length: 4 }, () => promisify(execFile)(process.execPath,
    ["--import", "tsx", "-e", 'require("./lib/db.ts").db.close()'], { env: process.env })));
  const database = await import("./db");
  t.after(() => {
    database.db.close();
    if (path.dirname(directory) === path.resolve(tmpdir()) && path.basename(directory).startsWith("clash-sub-test-")) {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  const subscriptions = await import("./subscriptions");
  const { generateConfigYaml } = await import("./generator");
  const { GET } = await import("../app/sub/[token]/route");
  let body = Buffer.from(`${vless}\n${hy2}`).toString("base64");
  let userinfo: string | undefined = "upload=1; download=2; total=100; expire=1791734400";
  let status = 200;
  let location: string | undefined;
  let calls = 0;
  t.mock.method(https, "get", (_url: URL, options: https.RequestOptions, callback: (response: unknown) => void) => {
    calls++;
    assert.equal(options.agent, false);
    assert.equal(options.family, 4);
    assert.equal(typeof options.lookup, "function");
    const response = Object.assign(new PassThrough(), { statusCode: status, headers: { "subscription-userinfo": userinfo, location } });
    const request = new EventEmitter();
    setImmediate(() => { callback(response); response.end(Buffer.from(body)); });
    return request;
  });
  const config = database.listSubscriptionConfigs(1)[0];
  const other = database.createSubscriptionConfig(1, "Other");
  database.db.prepare("insert into nodes (name, uri, config_id) values (?, ?, ?)").run("Test", vless, config.id);
  const url = "https://8.8.8.8/sub/test";
  await subscriptions.importSubscription(config.id, url);
  assert.equal(database.listNodes(config.id).length, 3);
  assert.equal(database.listNodes(other.id).length, 0);
  assert.equal(new Set(database.listNodes(config.id).map((n) => n.name)).size, 3);
  assert.equal(subscriptions.subscriptionUserinfo(config.id), userinfo);
  const imported = database.listNodes(config.id).find((n) => n.source_id && n.uri === vless)!;
  database.db.prepare("update nodes set enabled = 0, sort_order = 999 where id = ?").run(imported.id);
  await subscriptions.importSubscription(config.id, url);
  assert.equal(database.listNodes(config.id).length, 3);
  assert.equal(database.listNodes(config.id).find((n) => n.id === imported.id)?.enabled, 0);
  assert.equal(database.listNodes(config.id).find((n) => n.id === imported.id)?.sort_order, 999);
  const generated = yaml.load(generateConfigYaml(config.id, config.token)) as { proxies: Array<Record<string, unknown>> };
  assert.deepEqual(generated.proxies.map((p) => p.type), ["vless", "hysteria2"]);
  assert.equal(generated.proxies[1].password, "user:password");
  const response = await GET(new Request("https://example.com/sub/test"), { params: Promise.resolve({ token: config.token }) });
  assert.equal(response.headers.get("subscription-userinfo"), userinfo);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal((await GET(new Request("https://example.com/sub/test"), { params: Promise.resolve({ token: "invalid" }) })).status, 404);
  const previous = database.listNodes(config.id);
  body = "broken subscription";
  await assert.rejects(subscriptions.importSubscription(config.id, url));
  assert.deepEqual(database.listNodes(config.id), previous);
  assert.equal(subscriptions.subscriptionUserinfo(config.id), userinfo);
  status = 503;
  await assert.rejects(subscriptions.importSubscription(config.id, url));
  assert.deepEqual(database.listNodes(config.id), previous);
  status = 302;
  location = "http://127.0.0.1/private";
  const beforeRedirect = calls;
  await assert.rejects(fetchSubscription(url));
  assert.equal(calls, beforeRedirect + 1);
  location = "https://127.0.0.1/private";
  await assert.rejects(fetchSubscription(url), /公网/);
  status = 200;
  location = undefined;
  body = "x".repeat(2 * 1024 * 1024 + 1);
  await assert.rejects(fetchSubscription(url), /2 MiB/);
  body = hy2;
  await subscriptions.importSubscription(config.id, url);
  assert.equal(database.listNodes(config.id).length, 2);
  await subscriptions.importSubscription(config.id, `${url}2`);
  assert.equal(subscriptions.subscriptionUserinfo(config.id), "");
  const sources = subscriptions.listSubscriptionSources(config.id);
  subscriptions.removeSubscription(other.id, sources[0].id);
  assert.equal(subscriptions.listSubscriptionSources(config.id).length, 2);
  subscriptions.removeSubscription(config.id, sources[1].id);
  userinfo = undefined;
  await subscriptions.importSubscription(config.id, url);
  assert.equal(subscriptions.subscriptionUserinfo(config.id), "");
  subscriptions.removeSubscription(config.id, sources[0].id);
  assert.equal(database.listNodes(config.id).length, 1);
  assert.equal(database.listNodes(config.id)[0].source_id, null);
  await subscriptions.importSubscription(other.id, url);
  database.deleteSubscriptionConfig(other.id, 1);
  assert.equal(subscriptions.listSubscriptionSources(other.id).length, 0);
});
