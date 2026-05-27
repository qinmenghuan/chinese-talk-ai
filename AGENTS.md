# Learn Chinese AI

## 概要

`learn-chinese-ai` 是一个面向海外中文学习者的实时中文口语练习平台的 Monorepo 骨架。当前仓库以页面壳子、接口协议和共享包为主，适合做 UI、流程设计、API 联调和架构迭代。

## 核心模块

- `apps/web`：Next.js C 端练习站点，包含首页、历史页、练习页等。
- `apps/admin`：Vite 管理台，包含报告页、系统页等管理界面。
- `apps/api`：NestJS 后端骨架，提供示例接口和健康检查。
- `packages`：共享组件与配置，包括 UI、design tokens、shared types、shared zod schemas、tsconfig、eslint-config。

## 当前状态

- 代码结构已搭建完成，页面与接口壳子可本地启动。
- 还未接入真实数据库表、真实 Redis 缓存逻辑、真实豆包实时语音接口、真实报告生成与持久化链路。
- 目前适合的工作内容：
  - UI 页面和组件开发
  - API 协议设计与联调
  - Monorepo 共享包与代码规范维护
  - 语音与会话流程方案验证

## 技术栈

- 前端：`Next.js 16` + `React 19` + `TypeScript 5.9`
- 管理台：`Vite 7` + `React 19` + `TypeScript 5.9`
- 样式：`Tailwind CSS 4` + `shadcn/ui`
- 后端：`NestJS 11`
- 预计后端基础设施：`PostgreSQL 18` + `Redis 8`
- 语音方案：火山引擎实时语音RTC AI 互动方案（尚待接入）

## 重要提示

- 本项目目前是基础框架阶段，不要假设已有完整的业务数据层或实时语音链路。
- 进行开发时，优先保持 `apps/*` 与 `packages/*` 的边界清晰。
- 只在明确需要时参考 `docs/` 下的设计文档，避免把设计细节当成必须实现的当前功能。

## 本地启动快速参考

- 安装：`pnpm install`
- 启动：`pnpm dev`
- 常见地址：
  - `web`：`http://localhost:3000`
  - `admin`：`http://localhost:5173`
  - `api`：`http://localhost:3003/api/health`

## AI 任务指引

- 目标：帮助提升本项目的前端页面、管理台、API 接口和共享包能力。
- 不要假设已有完整的生产数据表、缓存逻辑或真实语音接入。
- 优先保持现有 Monorepo 结构和共享配置一致性。

## 精简代码规范（快速参考）

- 语言与类型：全仓使用 TypeScript，继承 `packages/tsconfig`，并开启 `strict` 模式。
- 格式与检查：使用 `packages/eslint-config` + Prettier；本地命令：`pnpm lint`、`pnpm format:write`、`pnpm typecheck`。
- 提交与 Hook：启用 Husky + lint-staged，`pre-commit` 做 `prettier --write` 与 `eslint --fix`，`pre-push` 做 `pnpm lint`/`pnpm typecheck`。
- 共享类型与校验：公共 DTO/类型放 `packages/shared-types`，zod schema 放 `packages/shared-zod`，Controller 入参使用 DTO + zod 校验。
- 前端样式：统一使用 Tailwind + `packages/design-tokens`，组件优先放 `packages/ui`，避免页面中硬编码样式。
- 代码组织：React 组件用 `PascalCase`，工具与普通文件用 `kebab-case`；禁止跨向 `packages` 的反向依赖。
- 日志与敏感信息：使用统一 logger，禁止在日志或提交中泄露密钥和完整 token。
- 最低要求：新代码必须通过 ESLint、Prettier、类型检查；关键流程需有基本测试和日志。
