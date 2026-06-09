# clashHupManager

一个自托管的 Clash/Mihomo 订阅管理器。它提供网页后台来维护节点、策略默认值和自定义规则，并输出可直接导入 Clash Verge / Mihomo 的远程订阅 URL。

项目内置一份参考 `qichiyuhub/rule` 思路整理的基础 Mihomo 模板，生成订阅时会在模板上动态注入你的节点和规则。

## 功能

- 管理后台登录
- 粘贴 `vless://` 链接并保存节点
- 自动解析 VLESS Reality 参数
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

开发环境未配置 `.env` 时，默认管理密码是：

```text
admin
```

## 环境变量

复制 `.env.example` 为 `.env`，并修改为强随机值：

```env
ADMIN_PASSWORD=your-admin-password
SESSION_SECRET=replace-with-a-long-random-string
SUB_TOKEN=replace-with-a-random-token
DATABASE_PATH=./data/app.db
BASE_URL=https://sub.example.com
```

说明：

- `ADMIN_PASSWORD`：后台登录密码
- `SESSION_SECRET`：登录 cookie 签名密钥
- `SUB_TOKEN`：订阅 URL token
- `DATABASE_PATH`：SQLite 数据库路径
- `BASE_URL`：生成订阅里规则列表 URL 时使用的公网地址

## Docker 部署

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
- 使用强随机 `SUB_TOKEN`
- 不要公开后台地址，或在反代层增加访问控制
- 定期备份 `data/app.db`
- 如果迁移服务器，只需要迁移 `.env` 和 `data/app.db`
