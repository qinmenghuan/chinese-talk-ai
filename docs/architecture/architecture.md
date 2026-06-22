# Project Architecture

## 1. Overview

本项目是一个面向海外中文学习者的实时中文口语练习平台。当前仓库是 Monorepo 骨架，包含前端 C 端练习站点、后台管理台、后端 API 服务以及共享组件和配置。

## 2. Tech Stack

- 前端：Next.js 16 + React 19 + TypeScript 5.9
- 管理台：Vite 7 + React 19 + TypeScript 5.9
- 样式：Tailwind CSS 4 + shadcn/ui
- 后端：NestJS 11
- 数据库：PostgreSQL 18
- 缓存：Redis 8
- 实时语音方案：火山引擎豆包实时语音（当前尚待接入）

## 3. High Level Architecture

项目采用前端、后端、共享包分离的 Monorepo 架构。C 端负责练习入口、语音交互与报告展示；管理台负责场景管理、统计与系统配置；API 服务负责会话管理、业务逻辑、报告生成和数据存储。

## 4. Directory Structure

```text
learn-chinese-ai/
  apps/
    web/        # Next.js C 端
    admin/      # Vite 管理台
    api/        # NestJS 后端
  packages/
    ui/             # 共享 UI 组件
    design-tokens/  # 统一样式 token
    shared-types/   # 前后端共享类型
    shared-zod/     # 共享 schema
    tsconfig/       # 共享 TypeScript 配置
    eslint-config/  # 共享 ESLint 配置
```

## 5. Module Responsibilities

- `apps/web`: 用户练习流程、实时语音输入、AI 输出展示、历史记录、报告查看。
- `apps/admin`: 场景与系统管理、统计报表、配置管理、运行状态监控。
- `apps/api`: 会话令牌、对话保存、报告生成、接口聚合、业务路由。
- `packages/ui`: 跨应用共享 UI 组件和样式封装。
- `packages/design-tokens`: 统一颜色、字号、间距、圆角、阴影等 token。
- `packages/shared-types` / `packages/shared-zod`: 统一 DTO、类型与验证规则。

## 6. Data Flow

用户在 C 端发起练习请求，前端通过 `apps/api` 的接口获取会话凭证，并发送实时语音数据或消息。API 服务负责校验、落盘、转发语音/文本到 AI 服务，并将结果返回给 C 端。会话结束后，API 将分析报告和历史记录保存到数据库。

## 7. Realtime Flow

1. C 端请求会话令牌。
2. API 生成会话凭证并返回。
3. C 端建立实时语音链路，发送语音输入。
4. AI 平台返回转写文本和语音回复。
5. 前端展示实时对话和同步文本。
6. 会话结束后，API 触发报告生成并保存结果。

## 8. API Design

- `GET /api/health`: 健康检查。
- `POST /api/session/start`: 创建匿名会话。
- `POST /api/session/message`: 接收用户消息/事件。
- `GET /api/session/history`: 获取练习历史。
- `POST /api/report/generate`: 生成或查询分析报告。

## 9. State Management

前端主要使用组件内状态和局部 store 管理会话状态、语音输入状态和页面数据。共享数据结构通过 `packages/shared-types` 或 `packages/shared-zod` 统一定义，避免不同应用之间的数据格式不一致。

## 10. Coding Rules

- 全仓使用 TypeScript 严格模式。
- ESLint 与 Prettier 分工明确：ESLint 负责语义规则，Prettier 负责格式化。
- 共享配置写在 `packages/tsconfig` 和 `packages/eslint-config`。
- UI 样式优先使用语义 token，避免硬编码颜色与间距。
- 提交前通过 Husky + lint-staged 做基础格式化和 lint 校验。

## 11. Current Focus

当前阶段主要推进：

- 完成 C 端和管理台页面框架。
- 完成 API 接口与会话协议设计。
- 搭建共享组件与类型体系。
- 为后续实时语音和报告链路留出扩展接口。

## 12. Future Plan

后续计划：

- 接入真实豆包实时语音链路。
- 完善 PostgreSQL 数据模型与 Redis 缓存逻辑。
- 增强报告生成与持久化能力。
- 提升管理台数据统计与场景配置能力。
- 逐步补齐业务落地、错误监控和性能优化。
