# DigitalOcean Deployment Guide

Updated: 2026-06-18

## Target Architecture

This document uses a low-cost deployment plan that is friendly to US/EU users and relatively simple to operate:

```text
Vercel: apps/web
DigitalOcean Droplet: apps/api + apps/admin + PostgreSQL + Redis
Cloudflare: DNS / HTTPS / WAF
```

Recommended server:

```text
DigitalOcean Basic Droplet
Region: New York or San Francisco
Image: Ubuntu 24.04 LTS
Size: 1 vCPU / 2 GB RAM / 50 GB SSD
Price: $12/month
```

Recommended domains:

```text
app.example.com    -> Vercel apps/web
api.example.com    -> Droplet Nginx -> NestJS API
admin.example.com  -> Droplet Nginx -> apps/admin static files
```

## Cost Estimate

Recommended MVP setup:

```text
Vercel Hobby: apps/web                 $0/month
Cloudflare Free: DNS / HTTPS / WAF     $0/month
DigitalOcean Basic Droplet 2GB         $12/month
------------------------------------------------
Total                                  $12/month
```

If traffic grows or memory becomes tight, upgrade to:

```text
DigitalOcean Basic Droplet 4GB         $24/month
```

Optional costs:

```text
Automated Backups: usually charged as a percentage of the Droplet price
Snapshots: charged by snapshot storage size
Reserved IP: usually free when attached to a Droplet; may be charged when unattached
```

To control cost during MVP, you can skip DigitalOcean automated backups at first and use the `pg_dump` cron backup script in this guide. Consider enabling DigitalOcean Backups once the project enters real production.

## Overall Deployment Layout

Inside the Droplet:

```text
/var/www/chinese-talk-ai
  repo/                 -> Git repository
  admin-dist/           -> apps/admin build output
  env/api.env           -> API production environment variables
  backups/postgres/     -> PostgreSQL backups

Nginx                   -> 80/443, public entry point
NestJS API              -> 127.0.0.1:3003, managed by pm2
PostgreSQL              -> 127.0.0.1:5432, local access only
Redis                   -> 127.0.0.1:6379, local access only
Vercel                  -> apps/web
Cloudflare              -> DNS / HTTPS / WAF / admin access protection
```

## Step 0: Pre-Deployment Code Check

The repository should satisfy:

```text
apps/api/package.json has start:prod
apps/api/src/main.ts reads PORT or API_PORT first
apps/api/src/common/database/migrations/ contains the initial migration
```

Current initial migration:

```text
apps/api/src/common/database/migrations/1781666156549-auto.ts
```

Recommended local checks before deployment:

```bash
pnpm install
pnpm build:web
pnpm build:admin
pnpm build:api
```

## Step 1: Create a DigitalOcean Droplet

In the DigitalOcean dashboard:

1. Go to Create -> Droplets.
2. Choose a region:

```text
New York: recommended default for eastern North America; also acceptable for Europe
San Francisco: better balance for US west coast and Asia
Frankfurt / Amsterdam / London: choose if European users are the priority
```

3. Choose image:

```text
Ubuntu 24.04 LTS x64
```

4. Choose Droplet Type:

```text
Basic
Regular CPU
1 vCPU / 2 GB RAM / 50 GB SSD
$12/month
```

5. For Authentication, choose SSH Key.
6. Hostname:

```text
chinese-talk-ai-prod
```

7. Do not enable Managed Database, Load Balancer, Kubernetes, or other extra services at this stage.

## Step 2: Configure DigitalOcean Cloud Firewall

Create a Cloud Firewall and only allow:

```text
22/tcp    SSH
80/tcp    HTTP
443/tcp   HTTPS
```

Do not expose:

```text
3003/tcp  Internal API port
5432/tcp  PostgreSQL
6379/tcp  Redis
```

Recommendations:

- If your home or office IP is stable, restrict SSH `22/tcp` to that source IP.
- PostgreSQL and Redis should listen only on localhost and never be exposed publicly.

## Step 3: First Login

DigitalOcean Ubuntu Droplets usually use `root` for the first login:

```bash
ssh root@<droplet_public_ip>
```

Create a deployment user:

```bash
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

Then log in as:

```bash
ssh deploy@<droplet_public_ip>
```

## Step 4: Initialize the Server

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl git unzip build-essential ca-certificates gnupg lsb-release rsync
```

Set timezone:

```bash
sudo timedatectl set-timezone UTC
```

Install UFW:

```bash
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

## Step 5: Install Node.js, pnpm, and pm2

Recommended: Node.js 22 LTS.

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

Enable pnpm:

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

## Step 6: Install PostgreSQL

For MVP, the Ubuntu repository version is acceptable. PostgreSQL 18 is not required at this stage.

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo systemctl status postgresql
```

Create database and user:

```bash
sudo -u postgres psql
```

Run inside psql:

```sql
CREATE USER chinese_talk_ai_user WITH PASSWORD '<strong-db-password>';
CREATE DATABASE chinese_talk_ai OWNER chinese_talk_ai_user;
GRANT ALL PRIVILEGES ON DATABASE chinese_talk_ai TO chinese_talk_ai_user;
\q
```

Confirm PostgreSQL is not exposed publicly:

```bash
sudo ss -lntp | grep 5432
```

Expected: local listening only, for example `127.0.0.1:5432`.

## Step 7: Install Redis

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
sudo systemctl status redis-server
```

Set Redis password:

```bash
sudo nano /etc/redis/redis.conf
```

Confirm or update:

```conf
bind 127.0.0.1 ::1
protected-mode yes
requirepass <strong-redis-password>
```

Restart and verify:

```bash
sudo systemctl restart redis-server
redis-cli -a '<strong-redis-password>' ping
```

Expected:

```text
PONG
```

## Step 8: Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx
```

Open in browser:

```text
http://<droplet_public_ip>
```

You should see the default Nginx page.

## Step 9: Pull the Project Code

Create the app directory:

```bash
sudo mkdir -p /var/www/chinese-talk-ai
sudo chown -R $USER:$USER /var/www/chinese-talk-ai
cd /var/www/chinese-talk-ai
```

Clone the repository:

```bash
git clone <your-github-repo-url> repo
cd repo
```

Install dependencies and build:

```bash
pnpm install --frozen-lockfile
pnpm build:api
pnpm build:admin
```

Copy Admin static files:

```bash
mkdir -p /var/www/chinese-talk-ai/admin-dist
rsync -av --delete apps/admin/dist/ /var/www/chinese-talk-ai/admin-dist/
```

## Step 10: Configure API Environment Variables

Create the environment file:

```bash
mkdir -p /var/www/chinese-talk-ai/env
nano /var/www/chinese-talk-ai/env/api.env
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

If Volcengine / Doubao realtime voice is enabled, append the corresponding secrets:

```env
DOUBAO_REALTIME_WS_URL=<realtime-ws-url>
DOUBAO_REALTIME_APP_ID=<app-id>
DOUBAO_REALTIME_API_KEY=<api-key>
DOUBAO_REALTIME_ACCESS_KEY=<access-key>
DOUBAO_REALTIME_RESOURCE_ID=volc.speech.dialog
DOUBAO_REALTIME_MODEL=<model>
DOUBAO_REALTIME_VOICE=<voice>

VOLCENGINE_RTC_APP_ID=<rtc-app-id>
VOLCENGINE_RTC_APP_KEY=<rtc-app-key>
VOLCENGINE_OPENAPI_AK=<openapi-ak>
VOLCENGINE_OPENAPI_SK=<openapi-sk>
VOLCENGINE_OPENAPI_HOST=rtc.volcengineapi.com
VOLCENGINE_RTC_AI_OPENAPI_VERSION=2024-12-01
```

Protect the file:

```bash
chmod 600 /var/www/chinese-talk-ai/env/api.env
```

## Step 11: Run Database Migrations

Enter the repository:

```bash
cd /var/www/chinese-talk-ai/repo
```

Load environment variables:

```bash
set -a
. /var/www/chinese-talk-ai/env/api.env
set +a
```

Run migration:

```bash
pnpm --filter @learn-chinese-ai/api migration:run
```

Verify tables:

```bash
PGPASSWORD='<strong-db-password>' psql -h 127.0.0.1 -U chinese_talk_ai_user -d chinese_talk_ai -c "\dt"
```

Expected tables:

```text
app_user
admin_user
auth_session
conversation
message
practice_scenario
report
scenario_role
user_identity
user_password_credential
user_preference
migrations
```

## Step 12: Start API with pm2

```bash
cd /var/www/chinese-talk-ai/repo/apps/api
set -a
. /var/www/chinese-talk-ai/env/api.env
set +a
pm2 start "pnpm start:prod" --name chinese-talk-ai-api
```

Save startup config:

```bash
pm2 save
pm2 startup
```

`pm2 startup` will print a `sudo ...` command. Copy and run it.

Check:

```bash
pm2 status
pm2 logs chinese-talk-ai-api
curl http://127.0.0.1:3003/api/health
```

Expected response includes:

```json
{
  "status": "ok",
  "service": "learn-chinese-ai-api"
}
```

## Step 13: Configure Nginx

Create a site:

```bash
sudo nano /etc/nginx/sites-available/chinese-talk-ai
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

    root /var/www/chinese-talk-ai/admin-dist;
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

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/chinese-talk-ai /etc/nginx/sites-enabled/chinese-talk-ai
sudo nginx -t
sudo systemctl reload nginx
```

Test:

```bash
curl -H "Host: api.example.com" http://127.0.0.1/api/health
curl -I -H "Host: admin.example.com" http://127.0.0.1/
```

## Step 14: Configure Cloudflare DNS

Add DNS records in Cloudflare:

```text
api.example.com    A      <droplet_public_ip>  Proxied
admin.example.com  A      <droplet_public_ip>  Proxied
app.example.com    CNAME  <Vercel provided value>  DNS only or follow Vercel instructions
```

Cloudflare SSL/TLS:

```text
SSL/TLS mode: Flexible initially, Full recommended for production
Always Use HTTPS: On
Automatic HTTPS Rewrites: On
```

If you do not install certificates on the server yet, you can temporarily use `Flexible`. A better production setup is to install certificates on the server with Certbot, then switch Cloudflare to `Full`.

## Step 15: Install HTTPS Certificates on the Server

Install Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Request certificates:

```bash
sudo certbot --nginx -d api.example.com -d admin.example.com
```

Then set Cloudflare SSL/TLS mode to:

```text
Full
```

Test renewal:

```bash
sudo certbot renew --dry-run
```

## Step 16: Deploy apps/web to Vercel

In Vercel:

1. Add New -> Project.
2. Import the GitHub repository.
3. Framework Preset: Next.js.
4. Root Directory: `apps/web`.
5. Install Command: default or `pnpm install --frozen-lockfile`.
6. Build Command: default or `pnpm build`.
7. Add environment variables:

```text
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
NEXT_PUBLIC_ADMIN_URL=https://admin.example.com
```

8. Add domain:

```text
app.example.com
```

Follow Vercel instructions and add the required CNAME in Cloudflare.

## Step 17: Protect the Admin Site

Recommended: Cloudflare Zero Trust / Access.

1. Cloudflare Zero Trust -> Access -> Applications.
2. Add application.
3. Domain: `admin.example.com`.
4. Policy: allow only your email or team emails.
5. Session duration: for example, 24 hours.

This is only entry protection. Application-level RBAC is still needed later.

## Step 18: Release Update Flow

For each API / Admin update:

```bash
ssh deploy@<droplet_public_ip>
cd /var/www/chinese-talk-ai/repo
git pull
pnpm install --frozen-lockfile
pnpm build:api
export VITE_API_BASE_URL=https://api.example.com
export VITE_WEB_APP_URL=https://app.example.com
pnpm build:admin

set -a
. /var/www/chinese-talk-ai/env/api.env
set +a
pnpm --filter @learn-chinese-ai/api migration:run

rsync -av --delete apps/admin/dist/ /var/www/chinese-talk-ai/admin-dist/
pm2 restart chinese-talk-ai-api --update-env
sudo systemctl reload nginx
```

For each Web update:

```text
Push to GitHub -> Vercel automatically deploys apps/web
```

## Step 19: Back Up PostgreSQL

Create directory:

```bash
mkdir -p /var/www/chinese-talk-ai/backups/postgres
```

Create script:

```bash
nano /var/www/chinese-talk-ai/backups/backup-postgres.sh
```

Write:

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/www/chinese-talk-ai/backups/postgres"
DATE="$(date +%Y%m%d-%H%M%S)"
DB_NAME="chinese_talk_ai"
DB_USER="chinese_talk_ai_user"

export PGPASSWORD="<strong-db-password>"

mkdir -p "$BACKUP_DIR"
pg_dump -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" -F c -f "$BACKUP_DIR/$DB_NAME-$DATE.dump"
find "$BACKUP_DIR" -type f -name "*.dump" -mtime +14 -delete
```

Authorize and test:

```bash
chmod 700 /var/www/chinese-talk-ai/backups/backup-postgres.sh
/var/www/chinese-talk-ai/backups/backup-postgres.sh
ls -lh /var/www/chinese-talk-ai/backups/postgres
```

Configure daily backups:

```bash
crontab -e
```

Add:

```cron
30 3 * * * /var/www/chinese-talk-ai/backups/backup-postgres.sh >> /var/www/chinese-talk-ai/backups/postgres/backup.log 2>&1
```

Later, download backups locally or sync them to object storage. Keeping backups only on the same Droplet is risky if the disk fails.

## Step 20: Go-Live Checklist

Public check:

```bash
curl https://api.example.com/api/health
```

Browser checks:

```text
https://app.example.com
https://admin.example.com
```

Server checks:

```bash
pm2 status
sudo systemctl status postgresql
sudo systemctl status redis-server
sudo systemctl status nginx
df -h
free -h
```

Database check:

```bash
PGPASSWORD='<strong-db-password>' psql -h 127.0.0.1 -U chinese_talk_ai_user -d chinese_talk_ai -c "SELECT * FROM migrations;"
```

Security checklist:

```text
PostgreSQL is not exposed publicly
Redis is not exposed publicly
DigitalOcean Cloud Firewall only allows 22/80/443
UFW only allows 22/80/443
Cloudflare Access protects admin.example.com
AUTH_TOKEN_SECRET has been replaced with a strong random value
ADMIN_DEFAULT_PASSWORD is not the default value
AUTH_MOCK_GOOGLE_LOGIN=false
DB_SYNCHRONIZE=false
```

## Troubleshooting

### API 502

```bash
pm2 logs chinese-talk-ai-api
curl http://127.0.0.1:3003/api/health
sudo nginx -t
sudo systemctl status nginx
```

### Database Connection Failure

```bash
sudo systemctl status postgresql
PGPASSWORD='<strong-db-password>' psql -h 127.0.0.1 -U chinese_talk_ai_user -d chinese_talk_ai -c "SELECT 1;"
```

Confirm:

```text
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_DB=chinese_talk_ai
DATABASE_SSL=false
DB_SYNCHRONIZE=false
```

### Redis Connection Failure

```bash
sudo systemctl status redis-server
redis-cli -a '<strong-redis-password>' ping
```

Confirm:

```text
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=<strong-redis-password>
```

### Admin Blank Page

```bash
ls -lh /var/www/chinese-talk-ai/admin-dist
sudo nginx -t
```

Confirm build-time variables:

```bash
export VITE_API_BASE_URL=https://api.example.com
export VITE_WEB_APP_URL=https://app.example.com
pnpm build:admin
```

### Vercel Web Cannot Call API

Check:

```text
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
API CORS WEB_BASE_URL=https://app.example.com
Cloudflare DNS api.example.com points to the Droplet
```

## References

- DigitalOcean Droplets Pricing: https://www.digitalocean.com/pricing/droplets
- Vercel Pricing: https://vercel.com/pricing
- Cloudflare Plans: https://www.cloudflare.com/plans/
- Ubuntu Server: https://ubuntu.com/server
- Nginx: https://nginx.org/
- PostgreSQL: https://www.postgresql.org/
- Redis: https://redis.io/
