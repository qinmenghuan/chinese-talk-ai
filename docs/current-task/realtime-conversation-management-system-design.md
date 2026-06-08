# 实时对话管理模块系统设计

## 1. 文档目标

基于 `current-task-copy.md`，设计一套只覆盖 `apps/admin` 与 `apps/api` 的实时对话管理模块方案。  
本次只包含以下能力：

- 管理端实时对话列表查询
- 按条件筛选与分页
- 对单次实时对话执行逻辑删除
- 删除前二次确认，删除后刷新列表

本次不改动 `apps/web`，也不依赖其他 `docs` 文档。

## 2. 范围与边界

### 2.1 范围内

- `apps/admin`
  - 新增实时对话管理页面
  - 查询表单
  - 列表表格
  - 逻辑删除确认交互
- `apps/api`
  - 管理端实时对话查询接口
  - 管理端实时对话逻辑删除接口
  - 面向管理端的查询过滤、分页、数据组装
- `packages/shared-types`
  - 新增管理端实时对话模块 DTO / 响应类型
- `packages/shared-zod`
  - 新增查询参数与删除接口的 schema

### 2.2 范围外

- `apps/web` 页面或用户侧历史页改造
- 实时对话创建链路重构
- 报告模块重构
- 真实数据库建表与 ORM 接入
- 物理删除

## 3. 现状判断

从当前仓库实现看：

- 实时对话主数据目前主要存放在 `apps/api/src/common/runtime/practice-store.service.ts`
- 其中已维护：
  - `conversations`
  - `reports`
  - 对话状态
  - transcript
  - scenario 与 selectedRole
- 现有 `history` / `report` 相关结构已经能产出对话摘要与详情
- `apps/admin` 端已有成熟的列表页模式，可复用 `features/scenarios`、`features/users` 的组织方式

因此，本次设计优先选择：

- 在当前运行时 store 能力之上补一层管理端查询与逻辑删除能力
- 先保证管理端功能闭环
- 不扩大到数据库持久化改造

## 4. 设计原则

- 管理端业务代码统一放在 `apps/admin/src/features/conversations`
- 优先复用现有 admin 共通组件，不为单个页面新增一套样式体系
- API 设计遵循现有 admin 模块风格，统一走 `/api/admin/*`
- 删除使用逻辑删除，不直接从用户侧历史语义上物理移除底层对象
- 查询接口返回管理视角下的摘要数据，不直接返回完整 transcript
- 共享类型与 zod 校验放在 `packages/*`，避免前后端重复定义

## 5. 功能设计

## 5.1 管理端页面目标

新增一个“实时对话管理”页面，用于查看和删除实时对话记录。

页面核心结构：

1. 页面标题区
2. 查询工具栏
3. 列表表格
4. 分页
5. 删除确认弹窗
6. 操作反馈消息区

## 5.2 查询条件

根据需求文档，查询条件包含：

- 时间
- 用户
- 主题名
- 类型

建议拆为以下字段：

- `startedFrom`
  - 开始时间下限
- `startedTo`
  - 开始时间上限
- `userKeyword`
  - 用户搜索关键词
  - 在当前架构下优先匹配 `visitorToken`
  - 如果后续对话记录接入真实用户 id / displayName，可平滑扩展
- `title`
  - 主题名关键词
- `type`
  - 场景类型：`daily | interview | travel | business`
- `page`
  - 页码
- `pageSize`
  - 固定为 `20`

说明：

- 当前运行时会话里稳定可查的是 `visitorToken`，因此“用户”字段第一阶段按 `visitorToken` 过滤最稳妥
- 管理端展示文案可将该字段命名为 `User`
- 若未来有登录用户绑定关系，可把筛选逻辑升级为 `userId / email / displayName / visitorToken` 多字段搜索

## 5.3 列表展示字段

列表需要展示“实时对话的主要信息”，建议字段如下：

- `conversationId`
- `title`
- `scenarioType`
- `difficulty`
- `roleName`
- `visitorToken`
- `startedAt`
- `endedAt`
- `status`
- `reportState`
- `deleted`
- `actions`

说明：

- `deleted` 默认不作为查询条件暴露给页面，页面只显示未删除数据
- `actions` 当前只保留 `Delete`

## 5.4 删除交互

删除为逻辑删除，交互流程：

1. 用户点击列表行 `Delete`
2. 弹出二次确认框
3. 确认后调用逻辑删除接口
4. 删除成功后关闭弹窗
5. 刷新当前页数据
6. 若当前页只剩最后一条且被删除，可自动回退到上一页

## 6. 数据模型设计

## 6.1 运行时存储扩展

当前 `PracticeStoreService` 的 `StoredConversation` 需要扩展逻辑删除字段：

```ts
interface StoredConversation {
  id: string;
  anonymousSessionId: string;
  visitorToken: string;
  scenario: PracticeScenario;
  selectedRole: ScenarioRole;
  transcript: MessageItem[];
  status: ConversationStatus;
  startedAt: string;
  endedAt: string | null;
  deletedAt: string | null;
  deletedByAdminId: string | null;
}
```

设计意图：

- `deletedAt`
  - 标记是否已逻辑删除
- `deletedByAdminId`
  - 记录操作来源，便于后续审计

初始化时默认值：

- `deletedAt = null`
- `deletedByAdminId = null`

## 6.2 管理端返回对象

建议新增管理端实时对话列表项类型：

```ts
export interface AdminConversationListItem {
  id: string;
  title: string;
  scenarioType: ScenarioType;
  difficulty: PracticeDifficulty;
  roleName: string;
  visitorToken: string;
  startedAt: string;
  endedAt: string | null;
  status: ConversationStatus;
  reportState: HistoryReportState;
}
```

分页响应：

```ts
export interface AdminConversationListResponse {
  items: AdminConversationListItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}
```

查询参数：

```ts
export interface AdminConversationListQuery {
  startedFrom?: string;
  startedTo?: string;
  userKeyword?: string;
  title?: string;
  type?: ScenarioType;
  page?: number;
  pageSize?: number;
}
```

删除响应：

```ts
export interface DeleteAdminConversationResponse {
  success: true;
}
```

## 7. API 设计

## 7.1 查询接口

```http
GET /api/admin/conversations
```

Query 参数：

- `startedFrom`
- `startedTo`
- `userKeyword`
- `title`
- `type`
- `page`
- `pageSize`

响应：

```ts
ApiResponse<AdminConversationListResponse>;
```

处理逻辑：

1. 从 `PracticeStoreService` 获取全部实时对话
2. 过滤掉 `deletedAt !== null` 的记录
3. 按查询条件过滤
4. 按 `startedAt desc` 排序
5. 做分页切片
6. 映射为管理端列表项

## 7.2 逻辑删除接口

```http
DELETE /api/admin/conversations/:id
```

响应：

```ts
ApiResponse<DeleteAdminConversationResponse>;
```

处理逻辑：

1. 校验记录存在
2. 若已删除，直接返回成功或幂等成功
3. 写入：
   - `deletedAt = now`
   - `deletedByAdminId = currentAdminId`
4. 返回 `success: true`

说明：

- 这里仍使用 `DELETE` 语义，但底层执行逻辑删除
- 该设计与管理端删除场景模块时的使用习惯一致

## 8. 后端模块设计

建议在 `apps/api/src/modules/conversation` 下新增管理端 controller 能力，而不是新建完全独立的业务域模块。

推荐结构：

```txt
apps/api/src/modules/conversation/
  admin-conversation.controller.ts
  conversation.module.ts
  conversation.service.ts
```

职责划分：

- `admin-conversation.controller.ts`
  - 暴露管理端路由
  - 处理鉴权后的请求参数
- `conversation.service.ts`
  - 提供查询与逻辑删除方法
  - 从 `PracticeStoreService` 读取与更新数据
- `PracticeStoreService`
  - 作为当前运行时数据源
  - 承担逻辑删除字段写入

建议新增服务方法：

- `listAdminConversations(query)`
- `deleteConversationByAdmin(conversationId, adminId)`
- `listAllConversationsForAdmin()`
- `markConversationDeleted(conversationId, adminId)`

## 9. 前端模块设计

## 9.1 目录组织

管理端模块代码放在：

```txt
apps/admin/src/features/conversations/
```

推荐结构：

```txt
apps/admin/src/features/conversations/
  conversations-page.tsx
  conversations-filter-form.tsx
  conversations-table.tsx
  conversation-delete-dialog.tsx
  conversations.types.ts
```

## 9.2 页面结构

参考现有 `features/scenarios` 页面模式：

- `conversations-page.tsx`
  - 页面状态管理
  - 查询请求
  - 删除请求
  - 分页切换
- `conversations-filter-form.tsx`
  - 时间、用户、主题名、类型筛选
  - 查询 / 重置按钮
- `conversations-table.tsx`
  - 表格渲染
  - 删除按钮
- `conversation-delete-dialog.tsx`
  - 二次确认弹窗

## 9.3 共通组件复用

优先复用现有组件：

- `AdminPageToolbar`
- `AdminFormField`
- `AdminDataTable`
- `AdminPagination`
- `AdminConfirmDialog`

不建议为本页面再造新通用组件，除非现有组件无法支撑。

## 9.4 前端状态流

页面建议维护：

- `draftFilters`
- `appliedFilters`
- `data`
- `loading`
- `message`
- `deleteOpen`
- `deleteSubmitting`
- `deleteTarget`

交互流与 `scenarios-page.tsx` 保持一致，降低实现成本与维护负担。

## 10. 共享类型与校验设计

## 10.1 shared-types

在 `packages/shared-types/src/index.ts` 中新增：

- `AdminConversationListItem`
- `AdminConversationListQuery`
- `AdminConversationListResponse`
- `DeleteAdminConversationResponse`

## 10.2 shared-zod

在 `packages/shared-zod/src/index.ts` 中新增：

- `adminConversationListQuerySchema`
- `adminConversationListItemSchema`
- `adminConversationListResponseSchema`
- `deleteAdminConversationResponseSchema`

建议校验规则：

- `startedFrom` / `startedTo`
  - 非空时为 ISO 日期字符串
- `userKeyword`
  - trim 后最大长度限制
- `title`
  - trim 后最大长度限制
- `page`
  - `>= 1`
- `pageSize`
  - 默认 `20`
  - 上限 `100`

## 11. 过滤与分页规则

查询顺序建议如下：

1. 排除已逻辑删除数据
2. 时间过滤
3. 用户过滤
4. 主题名过滤
5. 类型过滤
6. 按 `startedAt desc` 排序
7. 分页切片

时间过滤规则：

- `startedFrom`
  - `conversation.startedAt >= startedFrom`
- `startedTo`
  - 建议按“当日结束”语义处理，避免用户只选日期时漏掉当天数据

## 12. 删除语义说明

逻辑删除后的记录：

- 不再出现在管理端默认列表里
- 不物理从运行时 Map 中移除
- 不影响已有报告对象结构

原因：

- 这样改动最小
- 风险最低
- 与当前“内存态运行时数据源”架构兼容

需要注意：

- 当前服务重启后，运行时内存数据会丢失
- 因此“逻辑删除”在当前阶段只对当前进程生命周期有效
- 这与当前项目整体仍处于骨架阶段的现状一致

## 13. 风险与约束

### 13.1 当前数据源非持久化

由于对话记录在内存中：

- 重启服务后数据会丢失
- 删除状态也不会保留

本次设计接受该约束，不扩展到数据库。

### 13.2 用户筛选能力有限

当前稳定可用的“用户标识”是 `visitorToken`，因此：

- 第一阶段查询里的 `用户` 更接近“访客标识”
- 若后续真实用户体系接入，可再升级筛选语义

### 13.3 管理端只做摘要查询

需求中没有要求对话详情页，因此本次不设计：

- transcript 查看页
- 对话详情弹窗
- 报告联动详情

## 14. 开发顺序建议

1. `packages/shared-types` 增加类型
2. `packages/shared-zod` 增加 schema
3. `PracticeStoreService` 扩展逻辑删除字段与管理端查询方法
4. `conversation` 模块新增 admin controller / service 方法
5. `apps/admin/src/features/conversations` 落页面
6. 在 admin 路由中接入新页面入口
7. 增加测试与联调验证

## 15. 测试设计

## 15.1 API 测试

至少覆盖：

- 能按 `title` 过滤
- 能按 `type` 过滤
- 能按 `visitorToken` 过滤
- 能按时间范围过滤
- 分页返回 `page/pageSize/total/hasMore`
- 删除后该记录不再出现在列表中
- 重复删除幂等

## 15.2 Admin 页面验证

至少覆盖：

- 查询条件可输入并触发请求
- 查询后表格按条件展示
- 分页切换正常
- 点击删除会出现二次确认
- 删除成功后当前页自动刷新

## 16. 验收映射

需求验收与设计对应关系如下：

- “能根据查询条件查询对话主题的列表”
  - 由 `GET /api/admin/conversations`
  - 管理端查询表单
  - 分页表格展示共同完成
- “能逻辑删除该次对话”
  - 由 `DELETE /api/admin/conversations/:id`
  - 删除确认弹窗
  - 列表刷新完成

## 17. 最终结论

本次最合适的落地方式是：

- 在现有 `PracticeStoreService` 运行时数据模型上增加逻辑删除字段
- 通过 `conversation` 模块补充管理端查询与删除接口
- 在 `apps/admin/src/features/conversations` 中复用现有列表页模式完成管理界面

这样可以在不改动 `apps/web`、不引入数据库改造、不过度扩张需求范围的前提下，最快形成一套可运行、可验证、可继续演进的实时对话管理模块。
