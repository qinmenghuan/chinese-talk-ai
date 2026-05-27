# Codebase Map

这份地图用于帮助 Codex 和开发者快速缩小搜索范围。默认先看这里，再决定是否进入 `docs/` 里的详细设计文档。

## Monorepo 总览

- `apps/web`：Next.js C 端练习站点
- `apps/admin`：Vite 管理台
- `apps/api`：NestJS API 骨架
- `packages/ui`：共享 UI 组件
- `packages/design-tokens`：共享设计 token
- `packages/shared-types`：共享 TypeScript 类型
- `packages/shared-zod`：共享 zod schema
- `packages/tsconfig`：共享 TypeScript 配置
- `packages/eslint-config`：共享 ESLint 配置

## apps/web 路由地图

- `/` -> `apps/web/app/page.tsx`
- `/history` -> `apps/web/app/history/page.tsx`
- `/practice` -> `apps/web/app/practice/page.tsx`
- `/reports/[id]` -> `apps/web/app/reports/[id]/page.tsx`

## apps/web 关键目录

- 页面布局与全局样式：`apps/web/app/layout.tsx`、`apps/web/app/globals.css`
- 练习体验：`apps/web/features/conversation/PracticeExperience.tsx`
- 历史体验：`apps/web/features/history/HistoryExperience.tsx`
- 报告体验：`apps/web/features/report/ReportExperience.tsx`
- 前端请求与 mock：`apps/web/lib/api.ts`、`apps/web/lib/mock-data.ts`

## apps/admin 地图

- 入口：`apps/admin/src/main.tsx`
- 主页面壳：`apps/admin/src/App.tsx`
- 样式：`apps/admin/src/styles.css`
- 构建配置：`apps/admin/vite.config.ts`

## apps/api 地图

- 启动入口：`apps/api/src/main.ts`
- 根模块：`apps/api/src/app.module.ts`
- 健康检查：`apps/api/src/modules/health`
- 会话与练习：`apps/api/src/modules/conversation`
- 实时语音：`apps/api/src/modules/realtime`
- 历史记录：`apps/api/src/modules/history`
- 报告：`apps/api/src/modules/report`
- 管理台接口：`apps/api/src/modules/admin`
- 场景数据：`apps/api/src/modules/scenario`
- 系统配置：`apps/api/src/modules/system-config`
- 基础设施：`apps/api/src/common/database`、`apps/api/src/common/redis`、`apps/api/src/common/volcengine`、`apps/api/src/common/runtime`

## packages 地图

- `packages/ui/src/components`：可复用展示组件
- `packages/ui/src/lib/cn.ts`：样式类名工具
- `packages/design-tokens/src/index.ts`：设计 token 导出
- `packages/shared-types/src/index.ts`：跨端共享类型
- `packages/shared-zod/src/index.ts`：跨端共享 schema

## 常用定向命令

- `pnpm dev:web`
- `pnpm dev:admin`
- `pnpm dev:api`
- `pnpm check:web`
- `pnpm check:admin`
- `pnpm check:api`

## 默认工作原则

- 改单个应用时，优先使用定向命令，不要默认跑根级 `turbo run ...`
- 除非任务明确要求，不要先读 `docs/` 详细方案
- 共享类型、schema、UI 改动优先落到 `packages/*`
