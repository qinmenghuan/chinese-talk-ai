# apps/web

## 作用域

- 这里是 Next.js 16 的 C 端练习站点。
- 默认只处理 `apps/web` 内的页面、特性组件和轻量前端工具。
- 需要复用 UI、设计 token、共享类型时，优先从 `packages/*` 引入，不要反向修改 `admin` 或 `api`。

## 快速入口

- 路由入口：`app/page.tsx`、`app/history/page.tsx`、`app/practice/page.tsx`、`app/reports/[id]/page.tsx`
- 布局与全局样式：`app/layout.tsx`、`app/globals.css`
- 主要特性组件：`features/conversation/PracticeExperience.tsx`、`features/history/HistoryExperience.tsx`、`features/report/ReportExperience.tsx`
- 前端数据与请求：`lib/api.ts`、`lib/mock-data.ts`

## 修改边界

- 页面内重复 UI 优先抽到 `packages/ui`，不要在页面里持续堆硬编码样式。
- 共享类型放 `packages/shared-types`，接口 schema 放 `packages/shared-zod`。
- 不要假设已经接入真实数据库、Redis 或完整实时语音链路。

## 本地验证

- 开发：`pnpm dev:web`
- lint：`pnpm lint:web`
- 类型检查：`pnpm typecheck:web`
- 完整检查：`pnpm check:web`

## 给 Codex 的建议

- 用户如果只改 C 端页面，请优先搜索 `apps/web/app` 和 `apps/web/features`。
- 除非任务明确要求，不要阅读 `docs/`，也不要扫描 `apps/admin`、`apps/api`。
