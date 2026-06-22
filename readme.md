# Learn Chinese AI

## 1. 项目介绍

`learn-chinese-ai` 是一个面向海外中文学习者的实时中文口语练习平台。

项目首版聚焦以下核心能力：

- PC 端 C 端练习站点
- PC 端管理台
- 实时语音输入
- AI 语音输出与文本同步展示
- 匿名会话
- 会话记录保存
- 练习结束后生成中文分析报告

当前仓库已经搭建了基础 Monorepo 框架，并提供了：

- `web`：消费端静态页面壳子
- `admin`：管理台静态页面壳子
- `api`：NestJS 模块骨架与示例接口
- `packages`：共享 UI、design tokens、共享类型、zod schema、tsconfig、eslint 配置

## 2. 框架介绍

项目采用 Monorepo 架构，目录结构如下：

```text
learn-chinese-ai/
  apps/
    web/            # Next.js C 端
    admin/          # Vite 管理台
    api/            # NestJS 后端
  packages/
    ui/             # 共享 UI 组件
    design-tokens/  # 颜色、字号、间距、圆角、阴影 token
    shared-types/   # 前后端共享类型
    shared-zod/     # 前后端共享 zod schema
    tsconfig/       # 共享 TypeScript 配置
    eslint-config/  # 共享 ESLint 配置
```

当前技术基线：

- C 端：`Next.js 16.2.x` + `React 19.2.x` + `TypeScript 5.9.x`
- 管理台：`Vite 7.3.x` + `React 19.2.x` + `TypeScript 5.9.x`
- 样式系统：`Tailwind CSS 4.1.x` + `shadcn/ui CLI 4.8.x`
- 图标库：`lucide-react 0.544.x`
- 后端：`NestJS 11.1.x`
- 数据库：`PostgreSQL 18.x`
- 缓存：`Redis 8.x`
- 语音方案：火山引擎实时语音RTC AI 互动方案

UI 和代码规范对应文档：

- `docs/conventions/code-conventions.md`
- `docs/conventions/UI-design.md`

## 3. 系统运行环境要求

### 3.1 本地基础环境

- Node.js `24.x` 或至少满足 `Next.js 16`、`NestJS 11`、`Vite 7` 的兼容版本
- pnpm `9.x`
- Windows PowerShell、macOS Terminal 或 Linux Shell 均可

### 3.2 本地服务依赖

- PostgreSQL
  - 默认配置见根目录 `.env`
  - `POSTGRES_HOST=localhost`
  - `POSTGRES_PORT=5432`
  - `POSTGRES_USER=postgres`
  - `POSTGRES_PASSWORD=123456`
  - `POSTGRES_DB=chinese_study`
- Redis
  - `REDIS_HOST=localhost`
  - `REDIS_PORT=6380`

### 3.3 环境变量

当前根目录 `.env` 里已经包含基础本地配置：

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=123456
POSTGRES_DB=chinese_study

REDIS_HOST=localhost
REDIS_PORT=6380
API_PORT=3003
```

后续接入真实豆包实时语音时，还需要补充类似下面的变量：

```env
VOLCENGINE_ACCESS_KEY=your_access_key
VOLCENGINE_SECRET_KEY=your_secret_key
DOUBAO_REALTIME_APP_ID=your_app_id
DOUBAO_REALTIME_MODEL=your_model_name
```

## 4. 怎么启动项目

### 4.1 安装依赖

在项目根目录执行：

```bash
pnpm install
```

### 4.2 启动全部应用

在项目根目录执行：

```bash
pnpm dev
```

默认情况下会同时启动：

- `web`
- `admin`
- `api`

当前本地验证时实际启动结果为：

- `web`：`http://localhost:3000`
- `admin`：`http://localhost:5173`
- `api`：`http://localhost:3003/api/health`

### 4.3 分应用启动

#### 启动 C 端

```bash
pnpm --filter @learn-chinese-ai/web dev
```

#### 启动管理台

```bash
pnpm --filter @learn-chinese-ai/admin dev
```

#### 启动 API

```bash
pnpm --filter @learn-chinese-ai/api dev
```

### 4.4 基础页面与接口验证

当前已经验证通过的本地地址：

- `web` 首页：`http://localhost:3000`
- `web` 历史页：`http://localhost:3000/history`
- `web` 练习页：`http://localhost:3000/practice`
- `admin` 报告页：`http://localhost:5173/reports`
- `admin` 系统页：`http://localhost:5173/system`
- `api` 健康检查：`http://localhost:3003/api/health`

### 4.5 当前说明

当前项目仍是第一阶段基础框架，包含页面壳子和示例接口，但还没有接入：

- 真实 PostgreSQL 数据表
- 真实 Redis 缓存逻辑
- 真实豆包实时语音接口
- 真实报告生成与持久化链路

因此目前更适合做：

- UI 与页面结构开发
- API 协议联调
- Monorepo 基础能力扩展
- 下一阶段的实时语音接入准备
