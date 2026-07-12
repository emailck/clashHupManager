import Database from "better-sqlite3";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";

const dbPath = path.resolve(process.cwd(), env.databasePath);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");

function tableExists(name: string) {
  return Boolean(db.prepare("select 1 from sqlite_master where type = 'table' and name = ?").get(name));
}

function hasColumn(table: string, column: string) {
  return (db.prepare(`pragma table_info(${table})`).all() as Array<{ name: string }>).some((item) => item.name === column);
}

const isLegacyDatabase = !tableExists("subscription_configs") && (tableExists("nodes") || tableExists("rules") || tableExists("settings"));
if (isLegacyDatabase) {
  const backupPath = `${dbPath}.pre-multi-config.bak`;
  db.pragma("wal_checkpoint(TRUNCATE)");
  if (!fs.existsSync(backupPath)) fs.copyFileSync(dbPath, backupPath);
}

const defaults: Array<[string, string]> = [
  ["default_proxy", ""],
  ["default_ai", ""],
  ["default_media", ""],
  ["default_fallback", "🚀 节点选择"],
  ["default_reject", "REJECT"],
];

function initializeConfigSettings(configId: number) {
  const insertConfigSetting = db.prepare("insert or ignore into config_settings (config_id, key, value) values (?, ?, ?)");
  for (const item of defaults) insertConfigSetting.run(configId, item[0], item[1]);
}

const initializeSchema = db.transaction(() => {
  db.exec(`
  create table if not exists nodes (
    id integer primary key autoincrement,
    name text not null,
    uri text not null,
    enabled integer not null default 1,
    sort_order integer not null default 0,
    config_id integer not null,
    created_at text not null default current_timestamp,
    updated_at text not null default current_timestamp,
    unique (config_id, name)
  );

  create table if not exists rules (
    id integer primary key autoincrement,
    list_type text not null,
    value text not null,
    enabled integer not null default 1,
    sort_order integer not null default 0,
    config_id integer not null,
    created_at text not null default current_timestamp
  );

  create table if not exists settings (
    key text primary key,
    value text not null
  );

  create table if not exists subscription_configs (
    id integer primary key autoincrement,
    name text not null unique,
    token text not null unique,
    created_at text not null default current_timestamp,
    updated_at text not null default current_timestamp
  );

  create table if not exists config_settings (
    config_id integer not null,
    key text not null,
    value text not null,
    primary key (config_id, key),
    foreign key (config_id) references subscription_configs(id) on delete cascade
  );

  create table if not exists sessions (
    token_hash text primary key,
    expires_at integer not null,
    created_at text not null default current_timestamp
  );
  `);

  if (!hasColumn("nodes", "config_id")) db.exec("alter table nodes add column config_id integer");
  if (!hasColumn("rules", "config_id")) db.exec("alter table rules add column config_id integer");

  if ((db.prepare("select count(*) as count from subscription_configs").get() as { count: number }).count === 0) {
    db.prepare("insert into subscription_configs (name, token) values (?, ?)").run("默认配置", env.subToken);
  }

  const legacyConfig = db.prepare("select * from subscription_configs where token = ?").get(env.subToken) as SubscriptionConfigRow | undefined
    || db.prepare("select * from subscription_configs order by id asc limit 1").get() as SubscriptionConfigRow;

  db.prepare("update nodes set config_id = ? where config_id is null").run(legacyConfig.id);
  db.prepare("update rules set config_id = ? where config_id is null").run(legacyConfig.id);

  const nodeSchema = db.prepare("select sql from sqlite_master where type = 'table' and name = 'nodes'").get() as { sql: string };
  if (nodeSchema.sql.toLowerCase().includes("name text not null unique")) {
    db.exec(`
      create table nodes_new (
        id integer primary key autoincrement,
        name text not null,
        uri text not null,
        enabled integer not null default 1,
        sort_order integer not null default 0,
        config_id integer not null,
        created_at text not null default current_timestamp,
        updated_at text not null default current_timestamp,
        unique (config_id, name)
      );
      insert into nodes_new (id, name, uri, enabled, sort_order, config_id, created_at, updated_at)
      select id, name, uri, enabled, sort_order, config_id, created_at, updated_at from nodes;
      drop table nodes;
      alter table nodes_new rename to nodes;
    `);
  }

  db.exec("create index if not exists idx_nodes_config_id on nodes (config_id); create index if not exists idx_rules_config_id on rules (config_id);");

  if ((db.prepare("select count(*) as count from config_settings").get() as { count: number }).count === 0) {
    const legacySettings = db.prepare("select key, value from settings").all() as Array<{ key: string; value: string }>;
    const insertLegacySetting = db.prepare("insert or ignore into config_settings (config_id, key, value) values (?, ?, ?)");
    for (const setting of legacySettings) insertLegacySetting.run(legacyConfig.id, setting.key, setting.value);
  }

  initializeConfigSettings(legacyConfig.id);

  const ruleCount = db.prepare("select count(*) as count from rules where config_id = ?").get(legacyConfig.id) as { count: number };
  if (ruleCount.count === 0) {
    const insertRule = db.prepare("insert into rules (list_type, value, sort_order, config_id) values (?, ?, ?, ?)");
    ["DOMAIN-SUFFIX,idcflare.com", "DOMAIN-SUFFIX,linux.do", "DOMAIN-SUFFIX,aicoco.xyz"].forEach((rule, index) => {
      insertRule.run("proxy", rule, (index + 1) * 10, legacyConfig.id);
    });
    ["DOMAIN-SUFFIX,sms.oai-gpt.com"].forEach((rule, index) => {
      insertRule.run("direct", rule, (index + 1) * 10, legacyConfig.id);
    });
  }
});

initializeSchema();

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

export type SubscriptionConfigRow = {
  id: number;
  name: string;
  token: string;
  created_at: string;
  updated_at: string;
};

export function listSubscriptionConfigs() {
  return db.prepare("select * from subscription_configs order by id asc").all() as SubscriptionConfigRow[];
}

export function getSubscriptionConfig(id: number) {
  return db.prepare("select * from subscription_configs where id = ?").get(id) as SubscriptionConfigRow | undefined;
}

export function getSubscriptionConfigByToken(token: string) {
  return db.prepare("select * from subscription_configs where token = ?").get(token) as SubscriptionConfigRow | undefined;
}

export function createSubscriptionConfig(name: string) {
  const token = randomBytes(24).toString("base64url");
  const create = db.transaction(() => {
    const result = db.prepare("insert into subscription_configs (name, token) values (?, ?)").run(name, token);
    const configId = Number(result.lastInsertRowid);
    initializeConfigSettings(configId);
    return getSubscriptionConfig(configId)!;
  });
  return create();
}

export function updateSubscriptionConfig(id: number, name: string) {
  db.prepare("update subscription_configs set name = ?, updated_at = current_timestamp where id = ?").run(name, id);
  return getSubscriptionConfig(id);
}

export function deleteSubscriptionConfig(id: number) {
  const remove = db.transaction(() => {
    db.prepare("delete from nodes where config_id = ?").run(id);
    db.prepare("delete from rules where config_id = ?").run(id);
    db.prepare("delete from config_settings where config_id = ?").run(id);
    db.prepare("delete from subscription_configs where id = ?").run(id);
  });
  remove();
}

export function listNodes(configId: number) {
  return db.prepare("select * from nodes where config_id = ? order by sort_order asc, id asc").all(configId) as NodeRow[];
}

export function listRules(configId: number) {
  return db.prepare("select * from rules where config_id = ? order by sort_order asc, id asc").all(configId) as RuleRow[];
}

export function getSettings(configId: number) {
  const rows = db.prepare("select key, value from config_settings where config_id = ?").all(configId) as Array<{ key: string; value: string }>;
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}
