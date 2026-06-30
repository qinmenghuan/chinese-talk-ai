# Bug

共同规范中按钮有圆角， web端登录页，discovery页的按钮圆角没有生效

# Expected

- 按共同规范的按钮都有圆角

# Actual

- 没有圆角

# Scope

不要看其他的docs，不用看apps/admin，apps/api

# Root Cause

Web 端使用了 **Tailwind CSS v4** (`^4.1.12`)，但配置方式仍沿用 v3 的 `tailwind.config.ts`。

在 Tailwind CSS v4 中：

- 配置通过 CSS 指令（`@import "tailwindcss"`、`@source` 等）完成，**不再自动加载** `tailwind.config.ts`。
- `globals.css` 中只有 `@import "tailwindcss"`，没有 `@source` 指令来指定扫描外部包。
- `packages/ui` 中的 `Button` 组件使用了 `rounded-[var(--radius-button)]` 这个任意值类名，需要 Tailwind 在构建时发现。
- 由于缺少 `@source` 指令，Tailwind v4 只自动扫描 `apps/web` 目录内的文件，**完全遗漏了** `packages/ui` 中的类名。
- 因此 `rounded-[var(--radius-button)]` 类**从未被生成**到 CSS 输出中，按钮就没有圆角。

# 原因解释

Tailwind CSS v4 改变了配置范式：从 `tailwind.config.ts` 转向基于 CSS 的 `@import "tailwindcss"` 和 `@source` 指令。旧的 `tailwind.config.ts` 中的 `content` 路径（包括 `../../packages/ui/src/**/*.{ts,tsx}`）在 v4 中不生效。必须在 CSS 文件中用 `@source` 显式声明需要扫描的外部包路径，否则 Tailwind v4 不会扫描这些文件，导致其中使用的任意值类（如 `rounded-[var(--radius-button)]`）不会被生成。

# 修复方案

在 `apps/web/app/globals.css` 中添加 `@source` 指令，告诉 Tailwind CSS v4 扫描 `packages/ui` 和 `packages/design-tokens` 的源文件。

# 修改内容

- `apps/web/app/globals.css`：在 `@import "tailwindcss"` 后添加：
  ```css
  @source "../../../packages/ui/src";
  @source "../../../packages/design-tokens/src";
  ```

# Tasks

1. 找 root cause ✅
2. 解释原因 ✅
3. 给修复方案 ✅
4. 修改代码 ✅
5. 回归验证web端相关页面discovery,首页，登录页的按钮都是圆角 ✅
