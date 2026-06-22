# 系统设计文档：邮箱密码登录、注册、设置页与后台用户管理

## 1. 文档信息

- 来源需求：`docs/current-task/prd.md`
- 目标产物：基于当前 Monorepo 骨架，为 `apps/web`、`apps/api`、`apps/admin` 设计一套可落地的账号能力方案
- 设计原则：优先复用现有代码骨架，不假设已存在完整生产化用户中心、邮件系统或复杂账号绑定能力；本期新设计不得继续依赖匿名会话机制

## 2. 需求摘要

本期需求聚焦三块：

1. Web 端新增邮箱密码注册与登录，同时保留 Google 登录。
2. Web 端新增统一登录/注册入口、未登录访问限制、独立设置页表单规范。
3. Admin 端 users 模块可查看注册用户、编辑基础信息、启用/停用账号；停用账号后 Web 端不可登录。

按 PRD，行为要求如下：

- 首页右上角未登录显示 `Login` 和 `Register`，登录后只显示账号入口。
- 点击 `Login` 弹出登录框，支持邮箱密码登录和 Google 登录。
- 点击 `Register` 弹出注册框，邮箱密码注册成功后跳回首页，但不自动登录。
- 设置页支持修改 `Display name`、`Level`、`Learning goal`、`Preferred Doubao voice`。
- 已登录用户可以访问所有页面。
- 未登录用户只能访问首页和发现页；点击受限入口时，弹英文提示 `Please sign in first.`，并进入登录流程。
- Admin 可查询、编辑、启用/停用用户；被停用用户在 Web 端登录时收到友好提示。

## 3. 当前现状

### 3.1 Web 现状

- `apps/web/components/AuthProvider.tsx`
  - 已支持 `refreshSession()`、Google 登录跳转、退出登录。
  - 当前认证状态只有 `loading` / `authenticated` / `anonymous`。
- `apps/web/components/HeaderAuthActions.tsx`
  - 未登录态只有单个 `Google Sign In` 按钮。
  - 已登录态已有账号下拉，含 `Settings` 和 `Sign out`。
- `apps/web/features/settings/SettingsExperience.tsx`
  - 已存在独立 `/settings` 页面。
  - 未登录时当前实现会直接触发 Google 登录跳转。
  - 表单是纵向堆叠布局，不符合 PRD 的“label 与控件同一行”规范。
- `apps/web/components/SiteNav.tsx`
  - 当前导航项为 `/`、`/discovery`、`/practice`、`/history`。
  - 代码里使用的是 `/discovery`，而 PRD 描述中写的是 discover 页面。

### 3.2 API 现状

- `apps/api/src/modules/auth/auth.controller.ts`
  - 已提供 `GET /auth/google/start`
  - 已提供 `GET /auth/google/callback`
  - 已提供 `GET /auth/session`
  - 已提供 `POST /auth/refresh`
  - 已提供 `POST /auth/logout`
  - 已提供 `GET /me/profile`
  - 已提供 `PUT /me/profile`
- `apps/api/src/modules/auth/auth.service.ts`
  - 已完成 Google OAuth 登录、session 创建、refresh cookie 管理。
  - 已支持用户状态校验，`disabled` 用户会在 session 恢复时被拒绝。
  - 管理员登录已存在，但用户侧尚无邮箱密码登录。
- `apps/api/src/common/database/entities.ts`
  - 已有 `app_user`、`user_identity`、`user_preference`、`auth_session`。
  - `user_identity.provider` 当前仅支持 `"google"`。
  - 尚无用户密码凭证表。
  - 仓库中仍保留旧的 `anonymous_session` / `anonymousSessionId` 结构，但不应成为本次登录注册方案的基础。

### 3.3 Admin 现状

- `apps/admin/src/features/users/users-page.tsx`
  - 已有用户列表、筛选、编辑弹窗、启用/停用入口。
- `apps/api/src/modules/admin/admin-user.controller.ts`
  - 已有 `/admin/users` 列表、详情、状态修改、资料修改接口。
- `apps/api/src/modules/admin/admin.service.ts`
  - 已支持用户分页查询、资料修改、状态切换。

结论：

- Admin 端用户管理骨架已基本满足 PRD，只需保证“邮箱密码注册用户”进入同一用户主表即可。
- 真正缺口主要在用户登录方式、注册流程、统一弹框交互、登录门禁和设置页布局规范。
- 旧的匿名机制目前只应视为待退役遗留，不应在本期设计里继续扩展或复用。

## 4. 设计目标与非目标

### 4.1 设计目标

- 在不推翻现有认证架构的前提下，新增邮箱密码注册与登录。
- 保留 Google 登录，统一收口到一个账号体系和同一套 session 机制。
- Web 端引入全局认证弹框，而不是继续把登录入口绑定为“直接跳转 Google”。
- 让 Admin 管理的用户状态对邮箱密码登录和 Google 登录同时生效。
- 练习、历史、报告全部纳入“必须登录”范围，不再提供匿名练习链路。
- 所有新会话仅绑定 `userId`，不再新增任何基于 `anonymous_session`、`visitorToken`、伪匿名 session 的依赖。

### 4.2 本期非目标

- 不做邮箱验证。
- 不做忘记密码、重置密码、修改密码。
- 不做 Google 账号与邮箱密码账号自动合并。
- 不做复杂 RBAC 或多角色用户模型扩展。
- 不改造管理员登录体系。
- 不在本期内一次性清除所有历史匿名数据，但从本期开始停止新增匿名机制依赖。

## 5. 总体方案

系统继续采用“统一用户主表 + 多种凭证来源 + 统一 session”的设计，并明确弃用匿名会话作为用户练习主路径。

### 5.1 用户模型

- `app_user`
  - 仍作为唯一用户主表。
  - 存放邮箱、显示名、头像、状态、最后登录时间等公共资料。
- `user_identity`
  - 继续只承载第三方身份，本期仍主要用于 Google。
- `user_password_credential`
  - 新增本地密码凭证表，专门保存用户密码哈希。
- `user_preference`
  - 保持当前设计，用于设置页和 admin 编辑用户偏好。

### 5.2 认证模型

- Google 登录
  - 继续走 `GET /auth/google/start` 与 `GET /auth/google/callback`。
- 邮箱密码登录
  - 新增 `POST /auth/login`。
- 邮箱密码注册
  - 新增 `POST /auth/register`。
- 会话
  - 所有登录方式最终都统一为现有 `auth_session + accessToken + refresh cookie` 模式。
- 业务前提
  - 练习、历史、报告全部基于已登录用户执行。
  - 新建会话只写 `userId`，不再以匿名 visitor 作为归属依据。

### 5.3 管理模型

- Admin 端不区分用户来自 Google 还是邮箱密码注册。
- 只要用户记录存在于 `app_user`，Users 模块都可查、可编、可停用。
- 用户停用后：
  - 新登录会被阻止。
  - 已有 session 在下次恢复或访问受保护接口时失效。

### 5.4 匿名机制退役约束

- 本期新增登录注册能力不得继续复用 `anonymous_session`。
- 本期新增实时练习、历史、报告流程不得继续传递 `visitorToken`、`anonymousSessionId`。
- 旧匿名字段若因兼容历史数据暂时保留，只能处于“只读兼容”状态，不再产生新数据。

## 6. 目标架构

### 6.1 Web 架构

- `AuthProvider`
  - 扩展为前端认证中心。
  - 除 session 恢复外，新增登录弹框状态、注册弹框状态、邮箱登录/注册方法。
- `AuthModal`
  - 新增全局认证弹框组件。
  - 支持 `login` / `register` 双模式切换。
- `ProtectedRoute` / `ProtectedAction`
  - 新增统一保护逻辑，收口“未登录提示 + 打开登录框 + 记录 nextPath”。
  - 对 `practice`、`history`、`report` 采用强制登录策略，不再建立匿名会话。
- `SettingsExperience`
  - 保留独立路由。
  - 改造表单布局为桌面端双列、移动端单列。

### 6.2 API 架构

- `AuthController`
  - 继续承载用户认证相关接口。
  - 新增邮箱注册、邮箱密码登录接口。
- `AuthService`
  - 统一处理用户注册、用户登录、会话创建、状态校验。
  - 新增用户密码哈希与比对逻辑。
- `RealtimeService` / `ConversationService` / `HistoryService` / `ReportService`
  - 统一按 `userId` 归属数据。
  - 本期新流程不再依赖匿名 visitor 语义。
- `AdminService`
  - 继续复用，确保能操作所有用户主数据与偏好。

### 6.3 Admin 架构

- `UsersPage`
  - 不需要大改交互结构。
  - 只需保证新注册用户自动出现在现有列表中。
- `UserEditDialog`
  - 继续编辑显示名、等级、学习目标、偏好音色。
- `UserStatusAction`
  - 继续切换 `active` / `disabled`。

## 7. 数据模型设计

### 7.1 新增表：`user_password_credential`

建议结构：

| 字段                  | 类型           | 说明                         |
| --------------------- | -------------- | ---------------------------- |
| `user_id`             | `varchar(64)`  | 主键，同时关联 `app_user.id` |
| `password_hash`       | `varchar(191)` | 强哈希结果                   |
| `password_algo`       | `varchar(32)`  | 哈希算法标记，如 `scrypt`    |
| `password_updated_at` | `timestamptz`  | 最近更新时间                 |
| `created_at`          | `timestamptz`  | 创建时间                     |
| `updated_at`          | `timestamptz`  | 更新时间                     |

设计说明：

- `user_id` 一对一关联 `app_user`。
- 一个用户可以没有密码凭证，也就是“纯 Google 用户”。
- 密码哈希不应直接复用当前 admin 的 sha256 逻辑。

### 7.2 现有表复用

- `app_user`
  - 继续保存 `email`、`display_name`、`avatar_url`、`status`、`last_login_at`。
- `user_preference`
  - 注册成功时创建默认记录。
- `auth_session`
  - 保持现有 refresh token 会话模型。
- `user_identity`
  - 继续仅存 Google 身份。

### 7.3 匿名字段处置策略

- `anonymous_session`
  - 不纳入本期新方案的核心数据流。
  - 不再为新登录用户创建或复用匿名 session。
- `conversation.anonymous_session_id`
  - 历史兼容期间可暂时保留 nullable 字段。
  - 本期开始所有新会话写入时应为 `null`。
- 后续目标
  - 当旧代码和历史数据迁移完成后，删除 `anonymous_session` 表、外键、索引和共享协议字段。

### 7.4 状态与关系

- `app_user.status`
  - `active`：可登录、可恢复 session、可访问受保护资源。
  - `disabled`：登录被拒绝，session 恢复失败。
- `app_user` 与 `user_password_credential`
  - 一对一。
- `app_user` 与 `user_identity`
  - 一对多。

## 8. 核心流程设计

### 8.1 邮箱注册流程

1. 用户点击 `Register`。
2. Web 打开 `AuthModal(register)`。
3. 用户填写邮箱、密码、确认密码。
4. Web 执行基础校验。
5. API 校验邮箱唯一性与密码规则。
6. API 创建 `app_user`。
7. API 创建默认 `user_preference`。
8. API 创建 `user_password_credential`。
9. API 返回成功，不创建 session。
10. Web 关闭弹框，跳回首页，toast：`Registration successful. Please sign in.`

### 8.2 邮箱密码登录流程

1. 用户点击 `Login` 或被受限操作拉起登录框。
2. Web 打开 `AuthModal(login)`。
3. 用户输入邮箱和密码。
4. API 按邮箱查找用户。
5. API 校验用户状态是否为 `active`。
6. API 校验密码哈希。
7. API 创建 `auth_session`。
8. API 返回 `AuthSessionUser`，并写入 refresh cookie。
9. Web 保存 access token，刷新全局 session，关闭弹框。
10. Web 按 `nextPath` 跳转，否则回首页。

### 8.3 Google 登录流程

沿用现有流程：

1. 弹框内点击 `Continue with Google`。
2. 调用 `beginLogin(nextPath)`。
3. 后端完成 OAuth 回调并设置 refresh cookie。
4. 浏览器跳转 `web/login/callback`。
5. 前端恢复 session 后跳转目标页面。

### 8.4 练习与报告访问原则

- `Practice`
  - 必须登录后才能进入。
  - 未登录点击入口时提示 `Please sign in first.` 并拉起登录。
- `History`
  - 必须登录后才能访问。
  - 只返回当前 `userId` 下的会话历史。
- `Report`
  - 必须登录后才能访问。
  - 只允许访问当前 `userId` 自己的会话报告。
- 本期不再支持“匿名先练习、登录后再接管历史”的模式。

### 8.5 停用账号效果

用户被 Admin 停用后：

1. 新的邮箱密码登录请求返回失败。
2. Google 回调后若用户状态为 `disabled`，session 创建前即被拒绝。
3. 已有 refresh session 在下次 `GET /auth/session` 时，因为 `getActiveUserOrThrow()` 校验失败而失效。
4. Web 收到 401 后清空本地 token，并提示 `User account is disabled.`

## 9. API 设计

### 9.0 统一返回结构

本期所有新增和改动的相关接口，均必须使用共享返回结构：

```ts
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
```

约束如下：

- `code = 200` 表示业务成功。
- `message` 用于返回业务提示信息；成功时可返回空字符串或成功提示，失败时返回可展示给前端的业务异常说明。
- `data` 只承载成功返回的业务数据。
- 所有 Controller 继续通过 `createApiResponse()` 包装返回值，保持全仓接口风格一致。

成功示例：

```json
{
  "code": 200,
  "message": "",
  "data": {
    "success": true
  }
}
```

业务失败示例：

```json
{
  "code": 409,
  "message": "This email is already registered.",
  "data": null
}
```

### 9.1 新增接口

#### `POST /api/auth/register`

请求体：

```json
{
  "email": "learner@example.com",
  "password": "example123",
  "confirmPassword": "example123"
}
```

成功响应体：

```json
{
  "code": 200,
  "message": "",
  "data": {
    "success": true
  }
}
```

错误语义：

- `400 Bad Request`
  - 参数格式错误
  - 密码规则不满足
  - 两次密码不一致
- `409 Conflict`
  - 邮箱已存在

错误响应示例：

```json
{
  "code": 409,
  "message": "This email is already registered.",
  "data": null
}
```

#### `POST /api/auth/login`

请求体：

```json
{
  "email": "learner@example.com",
  "password": "example123"
}
```

成功响应体：

```json
{
  "code": 200,
  "message": "",
  "data": {
    "user": {
      "id": "user_xxx",
      "email": "learner@example.com",
      "displayName": "learner",
      "avatarUrl": null,
      "status": "active"
    },
    "preference": {
      "proficiencyLevel": "beginner",
      "learningGoal": "daily",
      "preferredVoiceId": "friendly-female"
    },
    "accessToken": "token",
    "expiresInSeconds": 3600
  }
}
```

并通过 `Set-Cookie` 写入现有用户 refresh cookie。

错误响应示例：

```json
{
  "code": 401,
  "message": "Email or password is incorrect.",
  "data": null
}
```

### 9.2 复用接口

- `GET /api/auth/session`
- `POST /api/auth/logout`
- `GET /api/me/profile`
- `PUT /api/me/profile`
- `POST /api/realtime/session`
- `POST /api/realtime/ticket`
- `POST /api/conversations/:id/close`
- `GET /api/history`
- `GET /api/history/:conversationId`
- `GET /api/reports/:conversationId`
- `GET /api/reports/:conversationId/detail`
- `GET /api/system-config/voices`
- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `PATCH /api/admin/users/:id/status`
- `PATCH /api/admin/users/:id/profile`

这些接口都应以登录用户为前提，不再接受匿名 visitor 身份参与主流程，并统一返回 `ApiResponse<T>` 结构。

### 9.3 错误文案规范

建议统一为前端可直接展示的英文文案：

- `Please sign in first.`
- `Email or password is incorrect.`
- `This email is already registered.`
- `User account is disabled.`
- `Registration successful. Please sign in.`
- `Settings saved.`

### 9.4 相关接口返回约束

除登录注册外，本期受影响接口也必须遵循同样的响应规范：

- `GET /api/auth/session`
  - `ApiResponse<AuthSessionUser>`
- `GET /api/me/profile`
  - `ApiResponse<{ user: UserProfile; preference: UserPreference }>`
- `PUT /api/me/profile`
  - `ApiResponse<{ user: UserProfile; preference: UserPreference }>`
- `POST /api/realtime/session`
  - `ApiResponse<RealtimeSessionResponse>`
- `POST /api/realtime/ticket`
  - `ApiResponse<RealtimeTicketResponse>`
- `POST /api/conversations/:id/close`
  - `ApiResponse<ConversationCloseResponse>`
- `GET /api/history`
  - `ApiResponse<HistoryListResponse>`
- `GET /api/history/:conversationId`
  - `ApiResponse<ConversationDetail>`
- `GET /api/reports/:conversationId`
  - `ApiResponse<ReportSummary>`
- `GET /api/reports/:conversationId/detail`
  - `ApiResponse<ReportDetail>`
- `GET /api/admin/users`
  - `ApiResponse<AdminUserListResponse>`
- `GET /api/admin/users/:id`
  - `ApiResponse<AdminUserDetail>`

前端调用这些接口时，也应继续按现有 `ApiResponse<T>` 解包 `payload.data`。

## 10. 前端设计

### 10.1 认证状态中心

扩展 `apps/web/components/AuthProvider.tsx`：

- 保留：
  - `status`
  - `session`
  - `refreshSession()`
  - `beginLogin()`
  - `logout()`
- 新增：
  - `authModalMode: "login" | "register" | null`
  - `authNextPath: string | null`
  - `openLogin(nextPath?)`
  - `openRegister(nextPath?)`
  - `closeAuthModal()`
  - `loginWithPassword(input)`
  - `registerWithPassword(input)`

### 10.2 头部入口

改造 `apps/web/components/HeaderAuthActions.tsx`：

- 未登录态
  - 显示 `Login`
  - 显示 `Register`
- 已登录态
  - 继续显示当前账号名
  - 下拉项保留邮箱、`Settings`、`Sign out`

### 10.3 登录/注册弹框

新增建议组件：

- `apps/web/components/AuthModal.tsx`
- `apps/web/components/AuthDialogContent.tsx`

登录模式内容：

- 标题 `Sign in`
- 邮箱输入框
- 密码输入框
- `Sign in` 按钮
- `Continue with Google` 按钮
- 切换入口 `Don't have an account? Register`

注册模式内容：

- 标题 `Create account`
- 邮箱输入框
- 密码输入框
- 确认密码输入框
- `Register` 按钮
- 切换入口 `Already have an account? Sign in`

### 10.4 登录门禁与受限交互

建议新增统一守卫工具，例如：

- `apps/web/lib/auth-guard.ts`
- 或 `useProtectedAction()` hook

统一处理两类场景：

1. 点击受限入口
2. 直接访问受限页面

处理动作：

1. 阻止原始跳转
2. toast：`Please sign in first.`
3. 打开登录弹框
4. 记录 `nextPath`

### 10.5 受限范围

未登录用户允许访问：

- `/`
- `/discovery`

未登录用户受限：

- `/practice`
- `/history`
- `/settings`
- `/reports/[id]`

这些页面和动作都不再尝试构造匿名 session，也不再在前端保留 visitor 身份。

兼容说明：

- PRD 中写的是 discover 页面。
- 当前代码路由是 `/discovery`。
- 本设计建议继续以 `/discovery` 为主，若产品需要文案统一，可额外加 `/discover -> /discovery` 的路由兼容。

### 10.6 设置页布局

改造 `apps/web/features/settings/SettingsExperience.tsx`：

- 桌面端使用双列布局：
  - 左侧：字段标题 + 辅助说明
  - 右侧：输入框或选择器
- 移动端自动折叠为单列
- 继续使用现有资料接口和 voices 接口

字段保持：

- `Display name`
- `Level`
- `Learning goal`
- `Preferred Doubao voice`

## 11. 后端详细设计

### 11.1 实体扩展

在 `apps/api/src/common/database/entities.ts` 中新增：

- `UserPasswordCredentialEntity`

并加入 `databaseEntities` 导出数组。

同时约束：

- 本期不新增任何对 `AnonymousSessionEntity` 的新依赖。
- 新会话模型以 `userId` 为主键归属，不再要求先创建匿名会话。

### 11.2 AuthService 扩展

建议新增方法：

- `registerUser(input)`
- `loginUser(input, context)`
- `createPasswordCredential(userId, password)`
- `hashUserPassword(password)`
- `verifyUserPassword(password, hash)`
- `createDefaultUserPreference(userId)`

设计要求：

- 用户密码哈希与管理员密码哈希分开实现。
- 用户密码使用 `scrypt` 或 `argon2`。
- 登录成功后更新 `lastLoginAt`。
- 注册时 `displayName` 默认取邮箱 `@` 前缀。
- 新练习会话创建逻辑不得再生成 `pseudoVisitorToken` 或类似匿名映射。

### 11.3 AuthController 扩展

在现有控制器中新增：

- `POST /auth/register`
- `POST /auth/login`

保持原有返回结构通过 `createApiResponse()` 包裹，并确保新增 `/auth/register`、`/auth/login` 同样返回 `ApiResponse<T>`。

### 11.4 状态校验策略

- 邮箱密码登录前检查 `user.status`。
- Google 用户登录回调创建 session 前也检查 `user.status`。
- `GET /auth/session` 保持当前逻辑，通过 `getActiveUserOrThrow()` 防止停用用户继续使用旧 session。
- `RealtimeService`、`ConversationService`、`HistoryService`、`ReportService` 全部基于 `userId` 做资源归属校验。
- 对新的业务链路，`anonymousSessionId` 和 `visitorToken` 不再作为鉴权或归属条件。

## 12. Admin 设计

### 12.1 用户来源统一

Admin 用户管理不需要单独为邮箱注册用户开新模块。

因为：

- 无论来自 Google 还是邮箱密码注册，最终都写入 `app_user`。
- 用户偏好继续写入 `user_preference`。
- 当前 `AdminService` 的列表、详情、编辑、停用逻辑可直接复用。
- 随着匿名机制退役，后台用户管理和后台数据检索也将逐步减少对匿名 visitor 标识的依赖。

### 12.2 Admin 可见与可编辑字段

Users 模块继续展示：

- `email`
- `displayName`
- `status`
- `lastLoginAt`
- `createdAt`
- `preference`

继续允许编辑：

- `displayName`
- `Level`
- `Learning goal`
- `Preferred Doubao voice`
- `status`

### 12.3 Admin 与认证边界

本期 Admin 不负责：

- 重置用户密码
- 查看密码凭证
- 解绑第三方身份

这样可以避免在一期需求里把用户安全面扩得太大。

## 13. 共享类型与校验设计

在 `packages/shared-types` 与 `packages/shared-zod` 中新增：

- `LoginWithPasswordRequest`
- `RegisterWithPasswordRequest`
- `RegisterWithPasswordResponse`

建议 schema 规则：

- `email`: 合法邮箱
- `password`: `min(8)`，建议同时限定 `max(72)`
- `confirmPassword`: 与 `password` 一致

保留并复用：

- `AuthSessionUser`
- `UserPreference`
- `UpdateUserPreferenceRequest`
- Admin 用户相关 DTO

退役约束：

- 与新登录注册主流程无关的 `visitorToken`、`anonymousSessionId` 字段不再新增使用点。
- 后续匿名机制清理时，应同步从 shared types / shared zod 移除对应字段。

## 14. 安全设计

### 14.1 密码存储

- 用户密码必须使用强哈希。
- 推荐优先使用 Node 内置 `scrypt`，减少额外依赖负担。
- 密码比较必须采用安全比较方式，不可简单字符串相等。

### 14.2 Token 与 Cookie

- 继续沿用当前 access token + refresh cookie 双令牌模式。
- refresh cookie 继续保持 `HttpOnly`。
- 前端仅存 access token，不直接接触 refresh token 内容。

### 14.3 日志与错误

- 禁止记录明文密码。
- 邮箱可用于排障，但不应和密码一起出现在日志中。
- 登录失败统一返回模糊错误，避免泄露“邮箱存在但密码错误”这类信息。

## 15. 实施步骤

### 15.1 API

1. 新增 `UserPasswordCredentialEntity`
2. 扩展数据库实体注册
3. 新增 shared types 与 zod schema
4. 在 `AuthController` 增加注册、登录接口
5. 在 `AuthService` 增加注册、密码登录和哈希逻辑
6. 调整 realtime / history / report / conversation 主链路，仅基于 `userId` 建立和读取数据
7. 停止新代码对 `anonymous_session`、`visitorToken`、`anonymousSessionId` 的依赖
8. 复用现有 session 与 profile 返回结构

### 15.2 Web

1. 扩展 `AuthProvider`
2. 新增全局 `AuthModal`
3. 改造 `HeaderAuthActions`
4. 为导航、卡片、`practice/history/report/settings` 接入统一登录门禁
5. 改造设置页布局与未登录处理方式
6. 保留 `/login/callback` 作为 Google 回跳恢复页

### 15.3 Admin

1. 验证邮箱注册用户可进入现有 users 列表
2. 验证编辑资料和状态切换对新用户同样生效
3. 为停用账号后的 Web 登录失败补充联调验证

### 15.4 匿名机制退役准备

1. 停止新增匿名 session 数据
2. 停止新接口、新页面、新协议继续依赖 visitor 语义
3. 梳理历史 `anonymous_session` 与 `conversation.anonymous_session_id` 存量数据
4. 为后续删除实体、字段、索引和 shared types 做迁移准备

## 16. 验证方案

### 16.1 功能验收

- 首页右上角未登录显示 `Login` 和 `Register`
- 点击 `Login` 弹出包含邮箱密码和 Google 登录的弹框
- 点击 `Register` 弹出邮箱注册弹框
- 注册成功后回首页，且用户仍为未登录态
- 登录成功后右上角只显示账号入口
- 点击账号下拉中的 `Settings` 可进入设置页
- 设置页可保存 `Display name`、`Level`、`Learning goal`、`Preferred Doubao voice`
- 已登录用户可访问所有页面
- 未登录用户访问受限页面或点击受限入口时提示 `Please sign in first.`
- Practice、

History、Report 全部必须登录，不再存在匿名练习主链路

- Admin 可查询、编辑、启用/停用用户
- 被停用用户无法在 Web 端继续登录或恢复 session

### 16.2 测试建议

API：

- 注册成功
- 注册邮箱冲突
- 注册参数非法
- 邮箱密码登录成功
- 密码错误
- disabled 用户登录失败
- disabled 用户 session 恢复失败
- realtime session 仅允许登录用户创建
- history / report 仅允许读取当前登录用户的数据

Web：

- 头部未登录/已登录态切换
- 登录弹框与注册弹框切换
- 注册成功后不自动登录
- 受限入口触发 toast 与登录弹框
- 未登录用户无法进入 `practice/history/report`
- 设置页桌面/移动布局可用

Admin：

- 新注册用户出现在 users 列表
- 编辑用户基础资料成功
- 启用/停用切换成功

## 17. 风险与取舍

### 17.1 不自动合并同邮箱的 Google 与密码账号

风险：

- 用户可能认为“同邮箱应该自动互通”。

取舍：

- 自动合并需要额外身份验证，否则有账号串绑风险。

### 17.2 不做邮箱验证

风险：

- 理论上可用任意邮箱注册。

取舍：

- PRD 目标是先完成最小账号闭环，不引入额外外部依赖。

### 17.3 匿名机制不会在本期一次性物理删除

风险：

- 数据库和部分旧代码里仍可能暂时保留匿名字段，短期内会形成“设计已切换、遗留未完全清空”的过渡态。

取舍：

- 本期先确保新设计完全不再依赖匿名机制，再在后续独立任务中安全删除旧代码和历史数据。

### 17.4 保留 `/login/callback`

原因：

- Google OAuth 回跳后仍需要一个前端恢复 session 的承接页。
- 即使主入口改为弹框，该回调页仍是必要组件。

## 18. 结论

本方案以当前仓库已有的 Google 登录、用户资料、session 管理和 Admin 用户模块为基础，通过新增本地密码凭证表、扩展 `AuthService`、引入全局认证弹框和统一登录门禁，最小增量实现 PRD 所需的注册、登录、设置页和后台用户管理闭环。更重要的是，它明确要求新流程不再复用 `anonymous_session`、`visitorToken`、伪匿名会话等遗留机制，使练习、历史、报告全面切换到登录用户模型，为后续删除匿名机制代码和存量数据打下清晰边界。
