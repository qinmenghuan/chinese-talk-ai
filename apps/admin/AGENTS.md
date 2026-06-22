# apps/admin

## 作用域

- 这里是 Vite + React 19 的管理台。
- 默认只处理 `apps/admin` 内的页面壳子、管理界面组件和样式。
- 复用样式和基础组件时优先使用 `packages/ui` 与 `packages/design-tokens`。

## 快速入口

- 应用入口：`src/main.tsx`
- 主界面：`src/App.tsx`
- 全局样式：`src/styles.css`
- 构建配置：`vite.config.ts`、`tailwind.config.ts`

## 修改边界

- 不要把管理台业务逻辑塞回 `web`。
- 需要共享类型时放到 `packages/shared-types`，不要在 `admin` 内复制接口结构。
- 除非任务明确要求，不要顺带改 `api` 控制器或 `docs` 设计文档。

## 本地验证

- 开发：`pnpm dev:admin`
- lint：`pnpm lint:admin`
- 类型检查：`pnpm typecheck:admin`
- 完整检查：`pnpm check:admin`

## 给 Codex 的建议

- 用户如果只改管理台，请先看 `src/App.tsx` 和 `src/styles.css`，再决定是否下沉到 `packages/ui`。
- 默认不扫描 `apps/web` 和 `apps/api`，除非任务涉及共享包联动。
