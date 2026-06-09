import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";

const dbPath = path.resolve(process.cwd(), env.databasePath);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  create table if not exists nodes (
    id integer primary key autoincrement,
    name text not null unique,
    uri text not null,
    enabled integer not null default 1,
    sort_order integer not null default 0,
    created_at text not null default current_timestamp,
    updated_at text not null default current_timestamp
  );

  create table if not exists rules (
    id integer primary key autoincrement,
    list_type text not null,
    value text not null,
    enabled integer not null default 1,
    sort_order integer not null default 0,
    created_at text not null default current_timestamp
  );

  create table if not exists settings (
    key text primary key,
    value text not null
  );
`);

const defaults = [
  ["default_proxy", ""],
  ["default_ai", ""],
  ["default_media", ""],
  ["default_fallback", "🚀 节点选择"],
  ["default_reject", "REJECT"],
];

const insertSetting = db.prepare("insert or ignore into settings (key, value) values (?, ?)");
for (const item of defaults) {
  insertSetting.run(item[0], item[1]);
}

const ruleCount = db.prepare("select count(*) as count from rules").get() as { count: number };
if (ruleCount.count === 0) {
  const insertRule = db.prepare("insert into rules (list_type, value, sort_order) values (?, ?, ?)");
  ["DOMAIN-SUFFIX,idcflare.com", "DOMAIN-SUFFIX,linux.do", "DOMAIN-SUFFIX,aicoco.xyz"].forEach((rule, index) => {
    insertRule.run("proxy", rule, (index + 1) * 10);
  });
  ["DOMAIN-SUFFIX,sms.oai-gpt.com"].forEach((rule, index) => {
    insertRule.run("direct", rule, (index + 1) * 10);
  });
}

export type NodeRow = {
  id: number;
  name: string;
  uri: string;
  enabled: number;
  sort_order: number;
};

export type RuleRow = {
  id: number;
  list_type: string;
  value: string;
  enabled: number;
  sort_order: number;
};

export function listNodes() {
  return db.prepare("select * from nodes order by sort_order asc, id asc").all() as NodeRow[];
}

export function listRules() {
  return db.prepare("select * from rules order by sort_order asc, id asc").all() as RuleRow[];
}

export function getSettings() {
  const rows = db.prepare("select key, value from settings").all() as Array<{ key: string; value: string }>;
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}
