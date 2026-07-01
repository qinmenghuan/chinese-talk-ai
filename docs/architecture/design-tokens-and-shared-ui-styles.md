# Design Tokens and Shared UI Styles

## 背景

`packages/design-tokens` 是 web、admin 和共享 UI 组件的视觉规范来源，负责提供颜色、圆角、阴影等基础 token。`packages/ui` 使用 Tailwind class 和 CSS variables 组合样式，例如 `rounded-[var(--radius-button)]`。

为了让这些样式稳定生效，需要同时解决两个问题：

- CSS variables 必须在应用首屏渲染前可用。
- Tailwind 必须扫描到 `packages/ui` 中的 class，才能生成对应 CSS。

## Token 注入

`packages/design-tokens` 现在提供统一 helper：

- `cssVariables`：底层 token 到 CSS variable 的映射。
- `createCssVariableStyle()`：生成可用于 SSR style 的 CSS variable 对象。
- `applyCssVariables()`：把同一份变量写入 DOM style target。

web 是 Next.js 应用，使用 SSR：

- 在 `app/layout.tsx` 中通过 `createCssVariableStyle()` 生成 `<html style={...}>`。
- 这样首屏 HTML 已经包含 token，避免依赖客户端 `useEffect` 后补变量。

admin 是 Vite SPA：

- 在 `src/main.tsx` 中通过 `applyCssVariables(document.documentElement.style)` 注入。
- 这样 admin 不再手写 `Object.entries(cssVariables)` 循环，和 web 使用同一个 token 注入 API。

## Shared UI 样式扫描

`packages/ui` 的组件 class 位于 monorepo 共享包中，不在 app 默认源码范围内。web 和 admin 的全局 CSS 入口需要声明 Tailwind v4 source：

```css
@import "tailwindcss";
@source "../../../packages/ui/src";
```

这个配置的职责是告诉 Tailwind 扫描共享 UI 包，生成诸如 `rounded-[var(--radius-button)]` 的工具类。它不负责定义 token 值，token 值仍由 `packages/design-tokens` 注入。

## 设计取舍

这套方案保持三层职责清晰：

- `packages/design-tokens` 管 token 数据和注入 helper。
- `packages/ui` 管共享组件结构和 class 组合。
- `apps/web`、`apps/admin` 管各自运行时的 token 注入和 Tailwind source 接入。

短期内，应用通过 `@source` 引用 workspace 源码是 Tailwind v4 monorepo 场景下的轻量方案。未来如果 `packages/ui` 演进为独立构建发布的组件库，可以再升级为 UI 包产出 CSS 或提供 Tailwind preset。
