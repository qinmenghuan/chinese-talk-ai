# 系统设计文档

## 1. 文档说明

- 目标：基于 `docs/current-task/current-task.md` 的需求，为 `apps/web`、`apps/admin`、`apps/api` 和共享包给出一份可执行的系统设计方案。
- 范围：仅覆盖本次需求涉及的登录注册、鉴权、用户基础配置、登出、管理端登录、用户管理、实时语音 WebSocket 鉴权。
- 约束：
  - 不依赖其他 `docs/` 文档。
  - 保持当前 Monorepo 边界清晰，不把业务类型散落到 `apps/*`。
  - 兼容当前项目“骨架阶段”的现状，不假设已有完整生产数据层或第三方登录封装。

## 2. 需求摘要

### 2.1 Web 端

- 首页右上角增加 Google 登录/注册入口。
- 登录后右上角展示账号下拉菜单，至少包含：`设置`、`登出`。
- 首页点击主题对话卡片或导航菜单进入练习时，未登录用户要先跳转登录/注册。
- 实时语音 WebSocket 必须登录后才可建立连接。
- 用户可在设置页维护基础资料：
  - 水平：低 / 中 / 高
  - 学习目标：值与主题对话类型一致
  - 喜欢的豆包 AI 音色：下拉框选择

### 2.2 管理端

- 增加独立登录页。
- 默认超级账号：`admin / 123456`。
- 登录后可查看管理端所有功能，并支持退出。
- 增加用户管理模块，支持：
  - 查询
  - 启用 / 停用
  - 修改部分用户信息
- 可编辑用户基础配置：
  - 水平：低 / 中 / 高
  - 学习目标：值与主题对话类型一致
  - 喜欢的豆包 AI 音色：下拉框选择

## 3. 当前系统现状

### 3.1 Web

- `apps/web` 已有首页、发现页、练习页、历史页、报告页壳子。
- 当前练习页通过 `POST /api/realtime/session` 创建会话，并使用 `visitorToken` 建立 WebSocket 连接。
- 当前用户体系是匿名访客模型，没有注册用户、登录态、设置页和受保护路由。

### 3.2 Admin

- `apps/admin` 当前只有壳子式导航与指标/场景/报告/系统页，无登录页、无用户管理页、无权限控制。

### 3.3 API

- `apps/api` 已有 `realtime`、`history`、`scenario`、`report`、`admin` 等模块。
- 当前会话与历史围绕 `AnonymousSessionEntity + visitorToken` 工作。
- 还没有：
  - 用户实体
  - 管理员实体
  - 登录态管理
  - OAuth / Google 登录
  - JWT Guard / Admin Guard
  - WebSocket 登录票据

### 3.4 设计结论

- 本次需求本质上是从“匿名练习骨架”升级到“注册用户系统 + 管理后台”。
- 设计必须尽量复用现有 `scenario`、`realtime`、`history`、`report` 模块，避免推翻当前练习链路。
- 推荐采用“新增用户身份层，逐步替代匿名链路”的方案，而不是一次性重写所有会话逻辑。

## 4. 设计目标

- 用最小侵入方式为现有 Web 端补齐注册用户登录态。
- 把实时语音接口从 `visitorToken` 鉴权切换到“登录用户 + 短期实时票据”。
- 让 Admin 端具备独立登录能力，但认证底座尽量与 Web 共用。
- 用户偏好配置在前后端、共享类型、数据库之间保持单一事实来源。
- 允许后续继续保留匿名模型做兼容过渡，但新业务主链路统一基于 `userId`。

## 5. 总体方案

## 5.1 架构概览

新增四层能力：

1. 身份层
   - Web 用户：Google OAuth 登录
   - Admin 用户：账号密码登录
2. 会话层
   - Access Token：短期 JWT
   - Refresh Session：服务端持久化刷新会话
3. 权限层
   - User Guard：保护 Web 用户接口
   - Admin Guard：保护管理端接口
   - Realtime Ticket：保护 WebSocket 握手
4. 用户资料层
   - 用户基本信息
   - 学习偏好设置
   - 用户启停状态

## 5.2 模块边界

- `apps/web`
  - 负责登录入口、登录状态展示、登录跳转、设置页、受保护页面交互。
- `apps/admin`
  - 负责管理端登录页、退出、用户列表、用户编辑。
- `apps/api`
  - 负责 Google 回调、管理员登录、JWT 校验、用户资料 CRUD、用户管理、实时鉴权。
- `packages/shared-types`
  - 定义用户、偏好、管理端用户管理响应、认证会话等共享类型。
- `packages/shared-zod`
  - 定义上述类型的 schema，供接口校验与客户端消费。

## 6. 核心业务设计

## 6.1 用户模型

系统新增两类身份：

- 学习用户 `user`
  - 来源：Google 登录
  - 用途：Web 端练习、历史、设置、报告
- 管理员 `admin_user`
  - 来源：本地账号密码
  - 用途：Admin 端登录与用户管理

这样做的原因：

- 普通学习用户和后台管理员的生命周期、登录方式、权限边界不同。
- 保持表结构和权限逻辑清晰，避免为了一个默认超级管理员把所有学习用户都做成账号密码体系。

## 6.2 用户状态

学习用户状态定义为：

- `active`：可正常登录、练习、连接 WebSocket
- `disabled`：不可登录，不可创建实时会话，不可连接 WebSocket

管理员可修改用户状态。被停用用户的历史数据保留，但不能继续使用核心功能。

## 6.3 用户配置模型

用户基础配置采用独立 1:1 偏好表，字段如下：

- `proficiencyLevel`
  - 枚举：`beginner | intermediate | advanced`
  - UI 映射：`低 -> beginner`、`中 -> intermediate`、`高 -> advanced`
- `learningGoal`
  - 枚举：`daily | interview | travel | business`
  - 与当前场景类型保持一致
- `preferredVoiceId`
  - 字符串
  - 值来自系统配置允许的音色列表

说明：

- 为了复用当前场景与难度体系，后端内部统一继续使用 `beginner / intermediate / advanced`。
- Web 与 Admin 展示层使用中文标签，避免改动当前 `shared-types` 中已有难度设计。

## 6.4 登录与注册

### Web 用户

- 只提供 Google 登录，不单独做本地用户名密码注册。
- “登录”和“注册”在体验上共用 Google OAuth 流程：
  - 已存在用户：登录
  - 不存在用户：自动创建账号并登录

### Admin 用户

- 使用独立登录页。
- 默认种子超级管理员：
  - 用户名：`admin`
  - 初始密码：`123456`
- 生产环境要求支持通过环境变量覆盖默认密码，且首次登录后建议强制修改。

## 6.5 Web 端访问控制

页面访问策略：

- 公共页面：
  - `/`
  - `/discovery`
- 登录后访问：
  - `/practice`
  - `/history`
  - `/reports/[id]`
  - `/settings`

交互规则：

- 首页主题卡片、发现页主题卡片、首页导航中的练习/历史入口，如果用户未登录，则跳到 `/login?next=目标地址`。
- 登录成功后回跳到 `next` 指定页面。

## 6.6 实时语音鉴权

当前链路基于 `visitorToken`，本次改造后改为两段式鉴权：

1. 用户先用 Access Token 调用 `POST /api/realtime/session`
2. 后端返回 `conversationId` 后，前端再用登录态申请短期 `realtimeTicket`
3. 浏览器连接 `ws://.../api/realtime/ws?conversationId=xxx&ticket=xxx`
4. 后端校验：
   - 票据是否存在
   - 票据是否过期
   - 票据是否属于当前用户
   - 会话是否属于当前用户
   - 用户状态是否为 `active`

这样做的原因：

- 不把长期 JWT 暴露在 WebSocket query string。
- 可以实现一次性、短时效、与会话绑定的握手票据。
- 更容易控制停用用户和异常重连。

## 7. 技术方案设计

## 7.1 鉴权方案

采用双令牌方案：

- `accessToken`
  - JWT
  - 有效期建议 15 分钟
  - 用于普通 API 鉴权
- `refreshToken`
  - 长有效期
  - 服务端保存哈希值
  - 用于续签 access token

建议实现方式：

- API 通过 `Set-Cookie` 写入 `refreshToken` 的 HttpOnly Cookie。
- `accessToken` 通过登录响应返回给前端，前端保存在内存中；刷新页面后通过 `/auth/session` 或 `/auth/refresh` 恢复。
- Web 和 Admin 的 `fetch` 都统一加 `credentials: "include"`。

说明：

- 当前本地开发端口分离：Web `3000`、Admin `5173`、API `3003`。
- 需要在 API CORS 配置中显式允许 `credentials` 和白名单 origin。

## 7.2 Google 登录流程

推荐后端主导的 OAuth 授权码流程：

1. Web 点击“使用 Google 登录”
2. 浏览器跳转 `GET /api/auth/google/start?redirectUrl=...`
3. API 重定向到 Google 授权页
4. Google 回调 `GET /api/auth/google/callback`
5. API 校验用户信息并创建 / 登录用户
6. API 签发会话并重定向回 Web：
   - `/login/callback?next=...`
7. Web 在回调页调用 `/api/auth/session` 拉取当前用户，完成登录态恢复

说明：

- API 统一持有 Google Client Secret，避免把三方凭据放到 `apps/web`。
- 登录与注册合并，不需要单独做注册接口。

## 7.3 Admin 登录流程

1. Admin 访问 `/login`
2. 输入用户名密码
3. 调用 `POST /api/admin/auth/login`
4. API 校验 `admin_user`
5. 返回管理员 access token，并写 refresh cookie
6. Admin 保存 access token，跳转到 `/`
7. 退出时调用 `POST /api/admin/auth/logout`

## 7.4 WebSocket 鉴权流程

1. 用户登录
2. 用户在 Web 端点击开始练习
3. `POST /api/realtime/session`
4. API 创建 `conversation`，记录 `userId`
5. 前端调用 `POST /api/realtime/ticket`
6. API 在 Redis 生成一次性票据，TTL 建议 60 秒
7. 前端携带 `conversationId + ticket` 建立 WebSocket
8. `RealtimeWsBridge` 握手时完成票据核验
9. 连接建立成功后立即销毁该票据，防止重放

## 8. 数据模型设计

## 8.1 新增表

### `user`

- `id`
- `email`，唯一
- `display_name`
- `avatar_url`
- `status`：`active | disabled`
- `last_login_at`
- `created_at`
- `updated_at`

### `user_identity`

- `id`
- `user_id`
- `provider`：固定 `google`
- `provider_subject`
- `provider_email`
- `created_at`
- 唯一索引：`provider + provider_subject`

作用：

- 把三方身份与本地用户解耦，后续如果接入更多登录渠道，不需要改 `user` 主表结构。

### `user_preference`

- `user_id`，主键兼外键
- `proficiency_level`
- `learning_goal`
- `preferred_voice_id`
- `created_at`
- `updated_at`

### `admin_user`

- `id`
- `username`，唯一
- `password_hash`
- `role`：`super_admin`
- `status`：`active | disabled`
- `last_login_at`
- `created_at`
- `updated_at`

### `auth_session`

- `id`
- `actor_type`：`user | admin`
- `actor_id`
- `refresh_token_hash`
- `user_agent`
- `ip`
- `expires_at`
- `revoked_at`
- `created_at`

作用：

- 支撑退出登录、刷新令牌、单端失效、后台强制失效。

## 8.2 现有表改造

### `conversation`

新增字段：

- `user_id`，可空过渡字段

保留字段：

- `anonymous_session_id`

设计原则：

- 历史匿名会话兼容保留。
- 新创建的登录用户会话写入 `user_id`。
- 后续稳定后，可逐步废弃匿名主链路。

### `report`

- 不需要结构性改造。
- 通过 `conversation.user_id` 间接归属到用户。

## 8.3 Redis Key 设计

- `lcai:auth:realtime-ticket:{ticket}`
  - value：`{ userId, conversationId, expiresAt }`
  - TTL：60 秒
- `lcai:auth:session:blacklist:{jti}`
  - 可选
  - 用于主动吊销 access token

## 9. API 设计

## 9.1 Web 用户认证接口

### `GET /api/auth/google/start`

- 入参：
  - `next`：登录成功后的跳转地址

### `GET /api/auth/google/callback`

- 作用：
  - 处理 Google 回调
  - 创建或登录用户
  - 写 refresh cookie
  - 重定向回 Web

### `GET /api/auth/session`

- 作用：返回当前登录用户和偏好配置
- 鉴权：User Guard

响应建议：

```ts
{
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    status: "active" | "disabled";
  }
  preference: {
    proficiencyLevel: "beginner" | "intermediate" | "advanced";
    learningGoal: "daily" | "interview" | "travel" | "business";
    preferredVoiceId: string | null;
  }
}
```

### `POST /api/auth/logout`

- 作用：注销 refresh session，并清理 cookie
- 鉴权：已登录用户

### `POST /api/auth/refresh`

- 作用：刷新 access token
- 鉴权：依赖 refresh cookie

## 9.2 Web 用户资料接口

### `GET /api/me/profile`

- 返回当前用户基本资料和偏好。

### `PUT /api/me/profile`

- 可编辑字段：
  - `displayName` 可选
  - `proficiencyLevel`
  - `learningGoal`
  - `preferredVoiceId`

## 9.3 系统配置接口

### `GET /api/system-config/voices`

- 返回可选豆包音色列表：
  - `id`
  - `label`
  - `gender` 可选
  - `locale` 可选
  - `isDefault`

说明：

- 当前项目已有 `system-config` 模块，可直接扩展该模块承载音色列表查询。

## 9.4 实时练习接口

### `POST /api/realtime/session`

改造点：

- 鉴权：必须登录
- 删除或废弃请求里的 `visitorToken`
- 从登录态读取 `userId`
- 创建 `conversation.user_id`

### `POST /api/realtime/ticket`

- 鉴权：必须登录
- 入参：
  - `conversationId`
- 返回：
  - `ticket`
  - `expiresInSeconds`

### `GET /api/history`

改造点：

- 改为通过 `userId` 查询
- 不再依赖 `visitorToken` 参数

### `GET /api/history/:conversationId`

- 校验该会话归属当前用户

## 9.5 Admin 认证接口

### `POST /api/admin/auth/login`

- 入参：
  - `username`
  - `password`

### `GET /api/admin/auth/session`

- 返回当前管理员信息

### `POST /api/admin/auth/logout`

- 退出管理员会话

## 9.6 Admin 用户管理接口

### `GET /api/admin/users`

- 支持分页与关键字搜索
- 搜索字段：
  - `email`
  - `displayName`

### `GET /api/admin/users/:id`

- 查看用户详情与偏好配置

### `PATCH /api/admin/users/:id/status`

- 入参：
  - `status: "active" | "disabled"`

### `PATCH /api/admin/users/:id/profile`

- 可编辑字段：
  - `displayName`
  - `proficiencyLevel`
  - `learningGoal`
  - `preferredVoiceId`

## 10. 前端设计

## 10.1 Web 端页面与组件

新增页面：

- `/login`
- `/login/callback`
- `/settings`

改造页面：

- `/`
  - 右上角增加登录按钮或用户菜单
  - 首页主题入口未登录时跳转登录
- `/discovery`
  - 点击主题卡片时判断登录态
- `/practice`
  - 页面进入前校验登录态
  - 创建实时会话时不再传 `visitorToken`
- `/history`
  - 改为登录用户历史

新增前端能力：

- `AuthProvider`
  - 全局拉取 `/api/auth/session`
  - 提供 `user`、`isAuthenticated`、`logout`
- `ProtectedAction`
  - 封装点击后未登录跳转逻辑
- `UserMenu`
  - 展示头像、邮箱、设置、登出

## 10.2 Admin 端页面与组件

新增页面：

- `/login`
- `/users`
- `/users/:id` 或列表页右侧编辑抽屉

改造导航：

- 在左侧导航加入 `Users`
- 顶部或侧边加入当前管理员和退出按钮

新增前端能力：

- `AdminAuthProvider`
- `AdminRouteGuard`
- `UserTable`
- `UserEditForm`

## 11. 后端模块设计

## 11.1 新增模块

### `modules/auth`

职责：

- Google OAuth
- 用户登录态
- access token / refresh token 签发与续签
- Web 用户登出

### `modules/user`

职责：

- 当前用户资料查询
- 当前用户偏好设置更新

### `modules/admin-auth`

职责：

- 管理员登录
- 管理员当前会话查询
- 管理员退出

### `modules/admin-user`

职责：

- 用户分页查询
- 用户详情
- 用户启停
- 用户资料编辑

## 11.2 现有模块改造

### `modules/realtime`

- `CreateRealtimeSessionDto` 去掉 `visitorToken`
- `RealtimeService.createSession()` 改为使用 `userId`
- 新增实时票据签发接口
- `RealtimeWsBridge` 在握手阶段校验 `ticket`

### `modules/history`

- 列表和详情改为按 `userId` 过滤
- 取消对 `visitorToken` 的依赖

### `modules/system-config`

- 增加可选音色查询接口

### `common/database/entities.ts`

- 新增用户、管理员、会话、偏好实体
- 调整 `ConversationEntity`

## 12. 共享包设计

## 12.1 `packages/shared-types`

新增类型建议：

- `UserProfile`
- `UserPreference`
- `AuthSessionUser`
- `AdminSessionUser`
- `VoiceOption`
- `AdminUserListItem`
- `AdminUserDetail`
- `UpdateUserPreferenceRequest`
- `AdminUpdateUserRequest`

## 12.2 `packages/shared-zod`

新增 schema：

- `userStatusSchema`
- `proficiencyLevelSchema`
- `learningGoalSchema`
- `userPreferenceSchema`
- `userProfileSchema`
- `voiceOptionSchema`
- `adminUserListItemSchema`

设计原则：

- API DTO、前端请求体、响应体都优先围绕共享 schema 演进。
- 避免在 `apps/web` 或 `apps/admin` 单独复制一份用户配置枚举。

## 13. 安全设计

## 13.1 基础安全

- Access Token 短期有效。
- Refresh Token 按哈希持久化，数据库不存明文。
- API CORS 仅允许受控 origin。
- 管理端与用户端使用不同的 Guard 和角色校验。

## 13.2 账号状态控制

- 被停用学习用户：
  - 不能通过 `/auth/session`
  - 不能创建实时会话
  - 不能申请 WebSocket ticket
- 被停用管理员：
  - 不能登录 Admin

## 13.3 默认超级管理员风险

由于需求要求默认 `admin / 123456`，设计上必须补充以下限制：

- 仅在系统初始化时写入一次。
- 生产环境支持环境变量覆盖默认密码。
- 建议记录 `mustChangePassword` 标记，首次登录后提示修改。

## 13.4 WebSocket 安全

- Ticket 必须一次性使用。
- Ticket 与 `conversationId + userId` 绑定。
- Ticket 过期时间短。
- 握手成功后立即删除 Redis ticket。

## 14. 实施顺序

推荐分四阶段落地：

### 阶段 1：认证底座

- 新增用户、管理员、会话、偏好表
- 完成 JWT、refresh session、Guard
- 完成 Admin 登录

### 阶段 2：Web 登录与设置

- 接入 Google OAuth
- 增加 Web 头部登录态和设置页
- 完成 `/auth/session`、`/me/profile`

### 阶段 3：实时练习与历史鉴权改造

- `realtime/session` 切到 `userId`
- 增加 `realtime/ticket`
- WebSocket 握手改造
- `history` 切到用户维度

### 阶段 4：管理端用户管理

- 增加 `/users` 列表
- 支持查询、启停、编辑用户资料
- 完成退出与会话保护

## 15. 验收映射

### Web 验收映射

- 首页右上角 Google 登录/注册
  - 由 `apps/web` 头部 + `auth/google/start` 实现
- 登录后下拉框包含登出
  - 由 `UserMenu + POST /auth/logout` 实现
- 点击主题或菜单未登录跳转登录
  - 由 `ProtectedAction / route guard` 实现
- 实时语音 WebSocket 需要登录鉴权
  - 由 `User Guard + realtimeTicket + RealtimeWsBridge` 实现
- 用户可配置水平、学习目标、音色
  - 由 `/settings + /me/profile + /system-config/voices` 实现

### 管理端验收映射

- 管理端独立登录页
  - 由 `/login + /admin/auth/login` 实现
- 默认超级账号可登录并退出
  - 由 `admin_user` 种子数据 + `/admin/auth/logout` 实现
- 用户管理支持查询、启停、查看基础信息
  - 由 `/admin/users*` 系列接口与 `Users` 页面实现
- 管理员可编辑用户基础配置
  - 由 `/admin/users/:id/profile` 与编辑表单实现

## 16. 非目标

本次设计不包含以下内容：

- 真实支付体系
- 完整 RBAC 角色中心
- 多管理员角色分层
- 用户手机号或邮箱密码注册
- 复杂运营审计日志
- 历史匿名会话自动迁移到注册用户

## 17. 结论

本方案的核心是：

- 用 Google OAuth 为 Web 建立正式用户体系
- 用本地账号密码为 Admin 建立独立入口
- 用统一会话底座管理登录态
- 用 `userId + realtimeTicket` 替代当前匿名 `visitorToken` 实时鉴权
- 用独立 `user_preference` 支撑用户设置与后台编辑

这样既能满足当前需求，也能最大程度复用现有练习、历史、报告链路，适合当前仓库的骨架阶段继续迭代。
