# clashHupManager

一个自托管的 Clash/Mihomo 订阅管理器。它提供网页后台来维护节点、策略默认值和自定义规则，并输出可直接导入 Clash Verge / Mihomo 的远程订阅 URL。

项目内置一份参考 `qichiyuhub/rule` 思路整理的基础 Mihomo 模板，生成订阅时会在模板上动态注入你的节点和规则。

## 功能

- 管理后台登录
- 用户名密码登录与自助注册，用户订阅数据隔离
- 管理员可创建、启用/停用用户并重置用户密码
- 创建、切换、重命名和删除多份独立订阅配置
- 粘贴一个或多个 `vless://` 链接并保存节点
- 自动解析 VLESS Reality 参数
- 导入 HTTP(S) 上游订阅，支持明文/Base64 的 VLESS 与 Hysteria2 节点列表
- 查看上游流量和到期时间，手动更新节点与套餐信息
- 维护强制代理、强制直连规则
- 配置策略组默认值：
  - `🚀 节点选择`
  - `🤖 AI网站`
  - `🎬 媒体解锁`
  - `🐟 漏网之鱼`
  - `🛑 广告拦截`
- 生成 Clash/Mihomo YAML 订阅
- 输出自定义规则列表：
  - `/rules/proxy.list`
  - `/rules/direct.list`
- Docker 部署

## 技术栈

- Next.js
- TypeScript
- SQLite
- better-sqlite3
- js-yaml
- Docker Compose

## 本地开发

```bash
cp .env.example .env
npm install
npm run dev
```

打开：

```text
http://localhost:3000
```

开发环境未配置 `.env` 时，引导管理员账户为 `admin`，默认密码是：

```text
admin
```

生产环境会拒绝使用默认、过短或重复的 `ADMIN_PASSWORD`、`SESSION_SECRET`、`SUB_TOKEN`。

## 环境变量

复制 `.env.example` 为 `.env`，并修改为强随机值：

```env
ADMIN_PASSWORD=replace-with-a-strong-admin-password
SESSION_SECRET=replace-with-at-least-32-random-characters
SUB_TOKEN=replace-with-at-least-24-random-characters
DATABASE_PATH=./data/app.db
BASE_URL=https://sub.example.com
```

说明：

- `ADMIN_PASSWORD`：首次初始化时 `admin` 账户的密码；后续可在用户管理中重置
- `SESSION_SECRET`：登录 session HMAC 密钥，生产环境至少 32 位随机字符
- `SUB_TOKEN`：默认订阅配置的 URL token，生产环境至少 24 位随机字符；新建配置会自动生成独立 token，规则列表也会使用对应配置的 token 保护
- `DATABASE_PATH`：SQLite 数据库路径
- `BASE_URL`：生成订阅里规则列表 URL 时使用的公网地址

## Docker 部署

现有服务器更新和回滚步骤见 [部署维护说明](docs/deployment.md)，上游订阅使用方法见 [上游订阅导入](docs/upstream-subscriptions.md)。

```bash
cp .env.example .env
docker compose up -d --build
```

如果你使用 Nginx/Caddy 反代，请把 `BASE_URL` 设置为 HTTPS 域名：

```env
BASE_URL=https://sub.example.com
```

Clash Verge 导入订阅：

```text
https://sub.example.com/sub/<SUB_TOKEN>.yaml
```

在后台创建额外订阅配置后，每份配置会得到独立 URL，并分别维护节点、规则和策略默认值。

## 升级已有部署

首次启动包含多订阅配置的版本时，应用会先将现有数据库备份为 `data/app.db.pre-multi-config.bak`，再在一个 SQLite 事务中迁移数据。原有节点、规则和默认策略会归入“默认配置”，原 `SUB_TOKEN` 订阅 URL 保持可用。

升级前仍建议停止容器并额外保存一份 `data/app.db`：

```bash
docker compose down
cp data/app.db data/app.db.manual-backup
docker compose up -d --build
```

迁移失败时，应用不会提交部分 schema 或数据变更；保留容器日志和上述备份后再排查。

## 基础模板

基础模板文件：

```text
templates/qichiyu-mihomo.yaml
```

生成器会动态替换：

- `proxies`
- `proxy-groups` 中的节点列表
- `rule-providers.my_proxy.url`
- `rule-providers.my_direct.url`

自定义规则使用 classical 格式，例如：

```text
DOMAIN-SUFFIX,linux.do
DOMAIN,idcflare.com
PROCESS-NAME,cursor.exe
IP-CIDR,1.2.3.4/32,no-resolve
```

## 安全提示

不要提交这些内容：

- `.env`
- `data/app.db`
- 真实节点链接
- 订阅 token
- 服务端日志

仓库默认 `.gitignore` 已忽略上述运行时文件。节点信息只保存在部署机器的 SQLite 数据库中。

## 生产建议

- 使用 HTTPS
- 使用强随机 `ADMIN_PASSWORD`、`SESSION_SECRET` 和 `SUB_TOKEN`
- 升级为多用户版本后，使用管理员账户的用户管理面板维护账户状态和密码
- 不要公开后台地址，或在反代层增加访问控制
- Docker Compose 默认只绑定 `127.0.0.1:3000`，建议通过 Nginx/Caddy 暴露 HTTPS
- 定期备份 `data/app.db`
- 如果迁移服务器，只需要迁移 `.env` 和 `data/app.db`
