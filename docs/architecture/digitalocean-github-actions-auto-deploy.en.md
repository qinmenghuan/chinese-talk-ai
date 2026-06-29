# DigitalOcean Automatic Deployment with GitHub Actions

Updated: 2026-06-28

This guide explains how to deploy this monorepo automatically to a DigitalOcean
Droplet when code is pushed to the GitHub `main` branch.

The target in this document is a simple all-in-one MVP server:

```text
GitHub main branch
  -> GitHub Actions quality gate
  -> SSH into DigitalOcean Droplet
  -> pull exact commit
  -> install dependencies
  -> build apps/api and apps/admin
  -> run database migrations
  -> restart API with pm2
  -> serve Admin static files with Nginx
```

## Why This Deployment Shape

This repository is still in the framework and MVP stage. A single Droplet is
easier to operate than Kubernetes, managed containers, or a multi-service
platform split.

This guide deploys only:

```text
apps/api
apps/admin
```

`apps/web` is intentionally excluded. Host it separately, for example on Vercel,
DigitalOcean App Platform, or another web target, and point its API base URL to
`https://api.example.com/api`.

Reasons:

- It matches the requested deployment scope: `apps/api` is a NestJS service and
  `apps/admin` builds to static files.
- It keeps PostgreSQL and Redis private on the same server during MVP.
- It uses GitHub Actions only as the deployment controller, while the server
  remains the runtime.
- It avoids adding Dockerfiles before the project needs container orchestration.
- It is easy to replace later with DigitalOcean App Platform, Docker, or
  managed databases when traffic and operational needs grow.

## Target Runtime Layout

```text
/var/www/learn-chinese-ai
  repo/                 -> Git repository checked out on the server
  admin-dist/           -> apps/admin/dist copied here after each deployment
  env/api.env           -> production API runtime environment variables
  backups/postgres/     -> database backup files

Nginx
  api.example.com       -> reverse proxy to 127.0.0.1:3003
  admin.example.com     -> static files from admin-dist/

pm2
  learn-chinese-ai-api  -> NestJS production server

PostgreSQL
  127.0.0.1:5432 only

Redis
  127.0.0.1:6379 only
```

## Prerequisites

You need:

- A GitHub repository with this project pushed to `main`.
- A DigitalOcean Droplet running Ubuntu 24.04 LTS.
- A non-root Linux user named `deploy`.
- SSH access from your machine to `deploy@<droplet-ip>`.
- DNS records for:

```text
api.example.com    A    <droplet-ip>
admin.example.com  A    <droplet-ip>
```

Reason:

GitHub Actions will use SSH to run deployment commands on the server. Keeping a
dedicated `deploy` user avoids running application deployment as `root`.

## Step 1: Prepare the Droplet

SSH into the Droplet as `root` first:

```bash
ssh root@<droplet-ip>
```

Create the deployment user:

```bash
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

Install system packages:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl git unzip build-essential ca-certificates gnupg lsb-release rsync nginx postgresql postgresql-contrib redis-server ufw
```

Configure the firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Reason:

Only SSH, HTTP, and HTTPS should be public. The API process, PostgreSQL, and
Redis stay behind Nginx or localhost.

## Step 2: Install Node.js, pnpm, and pm2

Install Node.js 22 LTS:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

Enable pnpm through Corepack:

```bash
sudo corepack enable
corepack prepare pnpm@9.12.0 --activate
pnpm -v
```

Install pm2:

```bash
sudo npm install -g pm2
pm2 -v
```

Reason:

The root `package.json` declares `pnpm@9.12.0`, so production should use the
same package manager version as local development and CI. pm2 keeps the API
server running after SSH sessions end and restarts it on reboot.

## Step 3: Prepare PostgreSQL and Redis

Create the database:

```bash
sudo -u postgres psql
```

Run inside `psql`:

```sql
CREATE USER chinese_talk_ai_user WITH PASSWORD '<strong-db-password>';
CREATE DATABASE chinese_talk_ai OWNER chinese_talk_ai_user;
GRANT ALL PRIVILEGES ON DATABASE chinese_talk_ai TO chinese_talk_ai_user;
\q
```

Restrict Redis to localhost and set a password:

```bash
sudo nano /etc/redis/redis.conf
```

Confirm or update:

```conf
bind 127.0.0.1 ::1
protected-mode yes
requirepass <strong-redis-password>
```

Restart Redis:

```bash
sudo systemctl restart redis-server
redis-cli -a '<strong-redis-password>' ping
```

Expected:

```text
PONG
```

Reason:

For this MVP layout, PostgreSQL and Redis are infrastructure dependencies, not
public services. Localhost-only access reduces the attack surface.

## Step 4: Clone the Repository on the Server

Log in as `deploy`:

```bash
ssh deploy@<droplet-ip>
```

Create the app directory:

```bash
sudo mkdir -p /var/www/learn-chinese-ai
sudo chown -R deploy:deploy /var/www/learn-chinese-ai
cd /var/www/learn-chinese-ai
```

If the GitHub repository is private, create a read-only SSH key for the Droplet:

```bash
ssh-keygen -t ed25519 -C "digitalocean-read-learn-chinese-ai" -f ~/.ssh/github_repo_read
cat ~/.ssh/github_repo_read.pub
```

In GitHub, add the printed public key:

```text
Repository -> Settings -> Deploy keys -> Add deploy key
Title: digitalocean-read-learn-chinese-ai
Allow write access: unchecked
```

Configure SSH on the Droplet:

```bash
nano ~/.ssh/config
```

Write:

```sshconfig
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_repo_read
  IdentitiesOnly yes
```

Protect it:

```bash
chmod 600 ~/.ssh/config ~/.ssh/github_repo_read
ssh -T git@github.com
```

Clone the repository:

```bash
git clone git@github.com:<owner>/<repo>.git repo
cd repo
```

Install once:

```bash
pnpm install --frozen-lockfile
```

Reason:

The GitHub Actions deployment will update this same checkout on every push to
`main`. The server should not contain uncommitted local changes inside
`/var/www/learn-chinese-ai/repo`. The Droplet-to-GitHub key is separate from
the later GitHub-Actions-to-Droplet key: one lets the server read the repository,
and the other lets GitHub Actions SSH into the server.

## Step 5: Create the Production API Environment File

Create:

```bash
mkdir -p /var/www/learn-chinese-ai/env
nano /var/www/learn-chinese-ai/env/api.env
```

Write:

```env
NODE_ENV=production
PORT=3003
API_PORT=3003

WEB_BASE_URL=https://app.example.com
ADMIN_BASE_URL=https://admin.example.com
API_BASE_URL=https://api.example.com

AUTH_TOKEN_SECRET=<strong-random-secret>
AUTH_ACCESS_TTL=900
AUTH_REFRESH_TTL=2592000
AUTH_REALTIME_TICKET_TTL=60
AUTH_PASSWORD_SALT=<strong-random-salt>

ADMIN_DEFAULT_USERNAME=<admin-username>
ADMIN_DEFAULT_PASSWORD=<strong-admin-password>
AUTH_MOCK_GOOGLE_LOGIN=false

POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_USER=chinese_talk_ai_user
POSTGRES_PASSWORD=<strong-db-password>
POSTGRES_DB=chinese_talk_ai
DATABASE_SSL=false
DB_SYNCHRONIZE=false
DB_LOGGING=false

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=<strong-redis-password>
REDIS_DB=0

GOOGLE_CLIENT_ID=<optional-google-client-id>
GOOGLE_CLIENT_SECRET=<optional-google-client-secret>
```

If the realtime voice integration is enabled later, append the Volcengine /
Doubao variables used by `apps/api/src/common/volcengine/volcengine.config.ts`.

Protect the file:

```bash
chmod 600 /var/www/learn-chinese-ai/env/api.env
```

Reason:

Runtime secrets belong on the server, not in GitHub Actions logs or the Git
repository. Keep `WEB_BASE_URL` set to the real origin of `apps/web` if it is
hosted somewhere else; the API uses it for CORS and auth redirects.

## Step 6: Configure Nginx

Create the Nginx site:

```bash
sudo nano /etc/nginx/sites-available/learn-chinese-ai
```

Write:

```nginx
server {
    listen 80;
    server_name api.example.com;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

server {
    listen 80;
    server_name admin.example.com;

    root /var/www/learn-chinese-ai/admin-dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/learn-chinese-ai /etc/nginx/sites-enabled/learn-chinese-ai
sudo nginx -t
sudo systemctl reload nginx
```

Reason:

Nginx is the public entry point. It terminates HTTP/HTTPS traffic and forwards
API requests to the private Node.js process while serving Admin static files
directly.

## Step 7: Allow Deployment to Reload Nginx

The GitHub Actions workflow will need to test and reload Nginx after a
successful deploy. Allow only those two commands without an interactive sudo
password:

```bash
sudo visudo -f /etc/sudoers.d/learn-chinese-ai-deploy
```

Write:

```sudoers
deploy ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /usr/bin/systemctl reload nginx
```

Verify:

```bash
sudo -n nginx -t
sudo -n systemctl reload nginx
```

Reason:

GitHub Actions cannot type a sudo password during a non-interactive SSH
deployment. Limiting passwordless sudo to Nginx validation and reload keeps the
automation narrow.

## Step 8: Start the Services Once Manually

Build the project on the server:

```bash
cd /var/www/learn-chinese-ai/repo
export VITE_API_BASE_URL=https://api.example.com/api
pnpm build:api
pnpm build:admin
rsync -a --delete apps/admin/dist/ /var/www/learn-chinese-ai/admin-dist/
```

Run migrations:

```bash
set -a
. /var/www/learn-chinese-ai/env/api.env
set +a
pnpm --filter @learn-chinese-ai/api migration:run
```

Start API:

```bash
cd /var/www/learn-chinese-ai/repo/apps/api
set -a
. /var/www/learn-chinese-ai/env/api.env
set +a
pm2 start "pnpm start:prod" --name learn-chinese-ai-api
```

Save pm2 startup:

```bash
pm2 save
pm2 startup
```

`pm2 startup` prints a `sudo ...` command. Copy and run that command.

Reason:

The first manual start confirms the server can build Admin, run API migrations,
and start the API before GitHub Actions takes over. After this, the workflow can
restart the existing pm2 process instead of guessing how to bootstrap the whole
server.

## Step 9: Add HTTPS Certificates

Install Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Request certificates:

```bash
sudo certbot --nginx -d api.example.com -d admin.example.com
```

Test renewal:

```bash
sudo certbot renew --dry-run
```

Reason:

The API uses cookies and realtime WebSocket traffic, and Admin sends privileged
requests. Production should use HTTPS for secure cookies, browser permission
reliability, and user trust.

## Step 10: Create an SSH Key for GitHub Actions

On your local machine:

```bash
ssh-keygen -t ed25519 -C "github-actions-learn-chinese-ai" -f ./github-actions-learn-chinese-ai
```

Copy the public key to the server:

```bash
ssh-copy-id -i ./github-actions-learn-chinese-ai.pub deploy@<droplet-ip>
```

Confirm the key works:

```bash
ssh -i ./github-actions-learn-chinese-ai deploy@<droplet-ip> "whoami"
```

Expected:

```text
deploy
```

Reason:

GitHub Actions needs a non-interactive way to connect to the server. Use a
dedicated deployment key so it can be rotated without affecting your personal
SSH key.

## Step 11: Add GitHub Repository Secrets

In GitHub:

```text
Repository -> Settings -> Secrets and variables -> Actions -> New repository secret
```

Add:

```text
DO_HOST=<droplet-ip-or-hostname>
DO_USER=deploy
DO_SSH_PORT=22
DO_SSH_PRIVATE_KEY=<contents of ./github-actions-learn-chinese-ai>

PROD_API_BASE_URL=https://api.example.com/api
PROD_ADMIN_URL=https://admin.example.com
```

Reason:

GitHub Actions needs server connection details and the public API URL used when
building Admin. Do not put database passwords, Redis passwords, auth token
secrets, or Volcengine secrets in this workflow unless they are truly needed by
a build step.

## Step 12: Create the GitHub Actions Workflow

Create:

```text
.github/workflows/deploy-digitalocean.yml
```

Use:

```yaml
name: Deploy to DigitalOcean

on:
  push:
    branches:
      - main
  workflow_dispatch:

concurrency:
  group: production-digitalocean
  cancel-in-progress: false

jobs:
  verify:
    name: Verify
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.12.0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint API
        run: pnpm lint:api

      - name: Lint Admin
        run: pnpm lint:admin

      - name: Typecheck API
        run: pnpm typecheck:api

      - name: Typecheck Admin
        run: pnpm typecheck:admin

      - name: Test API
        run: pnpm test:api

      - name: Test Admin
        run: pnpm --filter @learn-chinese-ai/admin test

      - name: Build API
        run: pnpm build:api

      - name: Build Admin
        run: pnpm build:admin
        env:
          VITE_API_BASE_URL: ${{ secrets.PROD_API_BASE_URL }}

  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    needs: verify
    environment: production
    steps:
      - name: Configure SSH
        shell: bash
        run: |
          set -euo pipefail
          mkdir -p ~/.ssh
          chmod 700 ~/.ssh
          printf '%s\n' "${{ secrets.DO_SSH_PRIVATE_KEY }}" > ~/.ssh/do_deploy_key
          chmod 600 ~/.ssh/do_deploy_key
          ssh-keyscan -p "${{ secrets.DO_SSH_PORT }}" -H "${{ secrets.DO_HOST }}" >> ~/.ssh/known_hosts

      - name: Deploy exact main commit
        shell: bash
        env:
          DO_HOST: ${{ secrets.DO_HOST }}
          DO_USER: ${{ secrets.DO_USER }}
          DO_SSH_PORT: ${{ secrets.DO_SSH_PORT }}
          GIT_SHA: ${{ github.sha }}
          PROD_API_BASE_URL: ${{ secrets.PROD_API_BASE_URL }}
        run: |
          set -euo pipefail

          ssh -i ~/.ssh/do_deploy_key -p "$DO_SSH_PORT" "$DO_USER@$DO_HOST" \
            "GIT_SHA='$GIT_SHA' PROD_API_BASE_URL='$PROD_API_BASE_URL' bash -s" <<'REMOTE_DEPLOY'
          set -euo pipefail

          APP_ROOT="/var/www/learn-chinese-ai"
          REPO_DIR="$APP_ROOT/repo"
          API_ENV_FILE="$APP_ROOT/env/api.env"
          ADMIN_DIST="$APP_ROOT/admin-dist"

          cd "$REPO_DIR"

          git fetch origin main
          git checkout --force "$GIT_SHA"
          git reset --hard "$GIT_SHA"

          corepack enable
          corepack prepare pnpm@9.12.0 --activate
          pnpm install --frozen-lockfile

          export VITE_API_BASE_URL="$PROD_API_BASE_URL"

          pnpm build:api
          pnpm build:admin

          set -a
          . "$API_ENV_FILE"
          set +a

          pnpm --filter @learn-chinese-ai/api migration:run

          mkdir -p "$ADMIN_DIST"
          rsync -a --delete apps/admin/dist/ "$ADMIN_DIST/"

          if pm2 describe learn-chinese-ai-api >/dev/null; then
            pm2 restart learn-chinese-ai-api --update-env
          else
            cd "$REPO_DIR/apps/api"
            pm2 start "pnpm start:prod" --name learn-chinese-ai-api
            cd "$REPO_DIR"
          fi

          pm2 save
          sudo -n nginx -t
          sudo -n systemctl reload nginx

          curl -fsS http://127.0.0.1:3003/api/health
          REMOTE_DEPLOY
```

Reason:

- `on.push.branches: [main]` makes deployment automatic only after code reaches
  the production branch.
- `verify` prevents broken API/Admin code from being deployed.
- `concurrency` prevents two production deploys from modifying the same server
  at the same time.
- `git checkout --force "$GIT_SHA"` deploys the exact commit that triggered the
  workflow, not whatever happens to be latest when SSH connects.
- The remote script builds on the Droplet so native dependencies and output
  paths match the production runtime.
- Migrations run before process restart so the new API code sees the expected
  database shape.

## Step 13: Add a GitHub Production Environment

In GitHub:

```text
Repository -> Settings -> Environments -> New environment -> production
```

Recommended settings:

```text
Deployment branches: main only
Required reviewers: enable for real production
Wait timer: optional
Environment secrets: optional, if you prefer them over repository secrets
```

Reason:

The workflow already runs only on `main`, but a GitHub environment adds another
guardrail. Required reviewers are useful once the app has real users.

## Step 14: Push to Main and Verify

Push a commit to `main`:

```bash
git push origin main
```

Watch:

```text
GitHub repository -> Actions -> Deploy to DigitalOcean
```

After the workflow succeeds, verify:

```bash
curl https://api.example.com/api/health
curl -I https://app.example.com
curl -I https://admin.example.com
```

On the server:

```bash
pm2 status
pm2 logs learn-chinese-ai-api --lines 50
pm2 logs learn-chinese-ai-web --lines 50
sudo nginx -t
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status redis-server
```

Reason:

The GitHub Actions success status only proves that deployment commands finished.
External HTTP checks prove DNS, Nginx, TLS, pm2, and the app are working
together.

## Step 15: Recommended Repo Improvement

`apps/web/package.json` currently has `dev`, `build`, `lint`, `typecheck`, and
`test`, but no production start script.

Recommended later:

```json
{
  "scripts": {
    "start:prod": "next start"
  }
}
```

Then update pm2 commands to:

```bash
PORT=3000 pm2 start "pnpm start:prod" --name learn-chinese-ai-web
```

Reason:

The documented workflow works with the current repository by using
`pnpm exec next start`, but a named script makes the production command easier
to discover and keeps it consistent with `apps/api`.

## Rollback

Find a previous commit:

```bash
cd /var/www/learn-chinese-ai/repo
git log --oneline -n 10
```

Deploy it manually:

```bash
cd /var/www/learn-chinese-ai/repo
git checkout --force <previous-sha>
pnpm install --frozen-lockfile
export NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api
export VITE_API_BASE_URL=https://api.example.com/api
export VITE_WEB_APP_URL=https://app.example.com
pnpm build:api
pnpm build:web
pnpm build:admin
rsync -a --delete apps/admin/dist/ /var/www/learn-chinese-ai/admin-dist/
pm2 restart learn-chinese-ai-api --update-env
PORT=3000 pm2 restart learn-chinese-ai-web --update-env
sudo nginx -t
sudo systemctl reload nginx
```

Reason:

A Git rollback is fast for application code. Database migrations are harder to
roll back, so destructive schema changes should be avoided until the project has
a tested migration rollback policy.

## Troubleshooting

### GitHub Actions Cannot SSH

Check:

```text
DO_HOST is correct
DO_USER is deploy
DO_SSH_PORT is 22 or your custom SSH port
DO_SSH_PRIVATE_KEY contains the private key, including BEGIN and END lines
The matching public key exists in /home/deploy/.ssh/authorized_keys
```

Server-side permissions:

```bash
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

### Workflow Fails During Build

Run the same command locally:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build:api
pnpm build:web
pnpm build:admin
```

If only production build fails, verify these GitHub secrets:

```text
PROD_API_BASE_URL=https://api.example.com/api
PROD_APP_URL=https://app.example.com
PROD_ADMIN_URL=https://admin.example.com
```

### API Returns 502

On the server:

```bash
pm2 logs learn-chinese-ai-api --lines 100
curl http://127.0.0.1:3003/api/health
sudo nginx -t
sudo systemctl status nginx
```

### Web Returns 502

On the server:

```bash
pm2 logs learn-chinese-ai-web --lines 100
curl -I http://127.0.0.1:3000
sudo nginx -t
sudo systemctl status nginx
```

### Admin Page Is Blank

Check:

```bash
ls -lah /var/www/learn-chinese-ai/admin-dist
grep -R "api.example.com" /var/www/learn-chinese-ai/admin-dist/assets || true
```

Rebuild with:

```bash
cd /var/www/learn-chinese-ai/repo
export VITE_API_BASE_URL=https://api.example.com/api
export VITE_WEB_APP_URL=https://app.example.com
pnpm build:admin
rsync -a --delete apps/admin/dist/ /var/www/learn-chinese-ai/admin-dist/
```

### Database Migration Fails

Check:

```bash
set -a
. /var/www/learn-chinese-ai/env/api.env
set +a
pnpm --filter @learn-chinese-ai/api migration:run
```

Then:

```bash
PGPASSWORD='<strong-db-password>' psql -h 127.0.0.1 -U chinese_talk_ai_user -d chinese_talk_ai -c "SELECT * FROM migrations;"
```

## Security Checklist

- DigitalOcean Cloud Firewall allows only `22`, `80`, and `443`.
- UFW allows only OpenSSH, `80/tcp`, and `443/tcp`.
- PostgreSQL listens only on localhost.
- Redis binds only to localhost and has a password.
- `AUTH_TOKEN_SECRET` and `AUTH_PASSWORD_SALT` are strong random values.
- `ADMIN_DEFAULT_PASSWORD` is not the default password.
- `AUTH_MOCK_GOOGLE_LOGIN=false` in production.
- `DB_SYNCHRONIZE=false` in production.
- GitHub Actions deploy key belongs only to this repository and this server.
- GitHub production environment is restricted to the `main` branch.
- Admin domain is protected later with Cloudflare Access or app-level RBAC.

## References

- GitHub Actions workflow syntax:
  https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- GitHub Actions secrets:
  https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions
- GitHub deployment environments:
  https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment
- DigitalOcean Droplets:
  https://docs.digitalocean.com/products/droplets/
- DigitalOcean SSH for Droplets:
  https://docs.digitalocean.com/products/droplets/how-to/connect-with-ssh/
- DigitalOcean Cloud Firewalls:
  https://docs.digitalocean.com/products/networking/firewalls/
- NodeSource Node.js distributions:
  https://github.com/nodesource/distributions
- pm2 process manager:
  https://pm2.keymetrics.io/docs/usage/quick-start/
- Nginx reverse proxy documentation:
  https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/
- Certbot with Nginx:
  https://certbot.eff.org/instructions

## 中文说明：GitHub Actions 自动发布到 DigitalOcean 服务器

### 目标

当 GitHub 仓库的 `main` 分支有代码提交时，自动触发 GitHub Actions：

- 先在 GitHub Actions 上执行质量检查（依赖安装、lint、typecheck、测试、构建）
- 再通过 SSH 登录到 DigitalOcean Droplet
- 拉取触发部署的准确提交
- 安装依赖、构建 `apps/api` 和 `apps/admin`
- 执行数据库迁移
- 将 `apps/admin/dist` 同步到服务器静态目录
- 重启 pm2 中的 API 进程
- 校验 Nginx 配置并重载

### 关键配置

1. 服务器上预先准备好 `deploy` 用户和 `deploy` 账户可访问的 SSH 公钥。
2. 在 GitHub 仓库中创建部署私钥类型的 secret：
   - `DO_HOST`：Droplet IP 或域名
   - `DO_USER`：`deploy`
   - `DO_SSH_PORT`：SSH 端口，通常是 `22`
   - `DO_SSH_PRIVATE_KEY`：GitHub Actions 用于 SSH 的私钥
   - `PROD_API_BASE_URL`：生产 API 地址，例如 `https://api.example.com/api`
   - `PROD_ADMIN_URL`：生产 Admin 地址，例如 `https://admin.example.com`
3. 服务器上需要安装 Node.js、pnpm、pm2、PostgreSQL、Redis、Nginx，并且已有项目目录结构：
   `/var/www/learn-chinese-ai/repo`、`/var/www/learn-chinese-ai/admin-dist`、`/var/www/learn-chinese-ai/env/api.env`。
4. 服务器上 `deploy` 用户必须可以无密码执行 `nginx -t` 和 `systemctl reload nginx`，这可以通过 sudoers 规则限制到这两个命令。

### 自动部署流程简介

- `verify` 作业在 GitHub Actions 上先检查代码是否可构建：
  - checkout
  - setup pnpm、Node.js
  - 安装依赖
  - lint + typecheck + test
  - 构建 `apps/api` 和 `apps/admin`
- `deploy` 作业只在 `verify` 成功后运行：
  - 使用 `DO_SSH_PRIVATE_KEY` SSH 到 Droplet
  - 在服务器上的仓库目录中 checkout 到触发的提交
  - 执行 `pnpm install --frozen-lockfile`
  - 设置 `VITE_API_BASE_URL` 进行 Admin 构建
  - 读取服务器上的 `api.env`，再执行数据库迁移
  - rsync Admin 构建结果到 `admin-dist`
  - pm2 重启 `learn-chinese-ai-api`
  - 校验 Nginx 配置并重载
  - 最后进行健康检查：`curl http://127.0.0.1:3003/api/health`

### 为什么要这样配置

- `main` 分支触发可以避免开发分支未准备好就发布到生产。
- 先在 Actions 端跑一遍 lint/typecheck/test，可以防止坏代码直接部署。
- 远程部署时使用精确 `git sha`，确保服务器上的代码和触发构建的提交一致。
- 在服务器上构建可以让本地与生产环境输出一致，避免生成路径差异。
- 只把 `apps/api` 和 `apps/admin` 发布到 Droplet，`apps/web` 可以继续放在 Vercel 或其他静态托管平台。

### 重要注意事项

- `api.env` 中不要把 GitHub Actions 的私钥或 SSH 密钥写进去。该文件只能由服务器持有。
- 数据库密码、Redis 密码、AUTH_SECRET 等敏感信息也不应放在工作流日志中。
- Auto deploy 只适用于生产 `main` 分支；如果需要测试环境，可另建 `staging` workflow。
- 如果 `apps/admin` 里引用了 `VITE_API_BASE_URL`，必须在 workflow 中传入正确生产地址。
- 如果部署失败，优先检查：SSH key、GitHub secret、server `deploy` 权限、Nginx `sudo` 权限。

### 成功后验证

- GitHub Actions 显示 `Deploy to DigitalOcean` workflow 成功。
- 访问 `https://api.example.com/api/health` 返回正常。
- 访问 `https://admin.example.com` 能打开后台页面。
- 服务器上 `pm2 status` 显示 `learn-chinese-ai-api` 正常运行。

### 如果要回滚

1. 登录服务器：`ssh deploy@<droplet-ip>`。
2. 进入仓库目录：`cd /var/www/learn-chinese-ai/repo`。
3. 查看历史提交：`git log --oneline -n 10`。
4. 切换到目标提交并重新部署：
   ```bash
   git checkout --force <previous-sha>
   pnpm install --frozen-lockfile
   export VITE_API_BASE_URL=https://api.example.com/api
   pnpm build:api
   pnpm build:admin
   rsync -a --delete apps/admin/dist/ /var/www/learn-chinese-ai/admin-dist/
   pm2 restart learn-chinese-ai-api --update-env
   sudo -n nginx -t
   sudo -n systemctl reload nginx
   ```

这段中文说明会直接放在文档末尾，帮助你更清晰地理解 “代码提交到 GitHub 就自动将 `apps/api` 和 `apps/admin` 发布到 DigitalOcean 服务器” 的配置思路。
