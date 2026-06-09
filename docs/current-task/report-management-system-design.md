# 报告管理模块系统设计

## 1. 文档目标

基于 `current-task.md`，设计一套只覆盖 `apps/admin` 与 `apps/api` 的报告管理模块方案。  
本次目标聚焦于：

- 管理端报告列表查询
- 报告逻辑删除
- 报告详情弹窗查看

本次不改动 `apps/web`，也不依赖其他 `docs` 文档。

## 2. 范围与边界

### 2.1 范围内

- `apps/admin`
  - 新增报告管理页查询区
  - 报告列表表格
  - 报告详情弹窗
  - 删除确认弹窗
- `apps/api`
  - 管理端报告查询接口
  - 管理端报告详情接口
  - 管理端报告逻辑删除接口
  - 面向管理端的过滤、分页、详情组装
- `packages/shared-types`
  - 新增管理端报告管理 DTO / 响应类型
- `packages/shared-zod`
  - 新增查询、详情、删除相关 schema

### 2.2 范围外

- `apps/web` 报告页改造
- 报告生成规则重构
- 报告 PDF 下载能力扩展
- 实时对话链路重构
- 数据库迁移脚本与生产化审计体系

## 3. 现状判断

当前仓库已经具备以下基础：

- `apps/api/src/modules/report/report.service.ts`
  - 已能按 `conversationId` 生成、读取报告
  - 已能组装 `ReportSummary` 与 `ReportDetail`
- `report` 与 `conversation` 当前是一对一关系
- `history` 模块已有对话摘要构造逻辑
- `admin` 端已有成熟的管理列表页模式：
  - `features/users`
  - `features/scenarios`
  - `features/conversations`
- `admin` 中 `ReportsPage` 仍是占位页，尚未接真实报告管理能力

因此本次设计应优先：

- 直接复用现有 `report`、`conversation`、`history-summary` 的数据能力
- 在 `apps/api` 上新增管理端视角的报告查询与删除能力
- 在 `apps/admin` 中沿用已有列表页、弹窗、分页、确认框模式

## 4. 设计原则

- 管理端业务代码统一放在 `apps/admin/src/features/reports`
- 优先复用现有 admin 共通组件，不新增独立设计体系
- 报告查询接口统一走 `/api/admin/reports`
- 删除使用逻辑删除，不做物理删除
- 详情弹窗内容尽量复用现有 `ReportDetail` 数据结构，保持和 `web` 报告内容相近
- 共享类型与 zod 校验统一维护在 `packages/*`

## 5. 功能设计

## 5.1 页面目标

管理端新增“报告管理”能力，页面包含：

1. 页面标题区
2. 查询工具栏
3. 列表表格
4. 分页
5. 报告详情弹窗
6. 删除确认弹窗
7. 操作消息反馈区

## 5.2 查询条件

根据需求，查询条件包括：

- 时间
- 用户
- 主题名
- 类型

建议拆分为以下字段：

- `startedFrom`
  - 对应会话开始时间下限
- `startedTo`
  - 对应会话开始时间上限
- `userKeyword`
  - 用户关键词
  - 优先匹配登录用户 `displayName / email / id`
  - 匿名对话可匹配 `anonymous_session.visitor_token_hash`
- `title`
  - 报告所属场景主题名关键词
- `type`
  - 场景类型：`daily | interview | travel | business`
- `page`
  - 页码
- `pageSize`
  - 固定 20

## 5.3 列表展示字段

列表展示“报告的主要信息”，建议字段如下：

- `reportId`
- `conversationId`
- `title`
  - 报告标题
- `scenarioTitle`
  - 会话主题名
- `scenarioType`
- `userDisplay`
- `roleName`
- `difficulty`
- `score`
  - 由 6 维平均分取整
- `status`
  - 报告状态
- `generatedAt`
- `actions`
  - `Detail`
  - `Delete`

## 5.4 详情交互

详情按钮点击后，弹出弹窗显示报告详情，内容尽量接近 `web` 报告页：

- 报告标题
- 报告摘要
- 六维评分
  - `grammarScore`
  - `vocabularyScore`
  - `fluencyScore`
  - `pronunciationScore`
  - `toneScore`
  - `naturalnessScore`
- `strengths`
- `issues`
- `suggestions`
- 会话基础信息
  - 场景标题
  - 类型
  - 角色
  - 难度
  - 开始 / 结束时间
  - 时长
- transcript 概览

说明：

- 由于需求要求“和 web 端的报告内容差不多”，建议直接使用管理端专用 detail 接口返回完整 `ReportDetail`
- 前端只在弹窗里做视觉整理，不重复拼装业务数据

## 5.5 删除交互

删除为逻辑删除，流程如下：

1. 点击 `Delete`
2. 弹出二次确认框
3. 确认后调用逻辑删除接口
4. 删除成功后关闭弹窗
5. 刷新当前页
6. 若当前页仅剩一条且被删除，可自动回退上一页

## 6. 数据模型设计

## 6.1 为什么逻辑删除挂在 report 上

当前 `report` 是独立结果表，一条 `conversation` 最多对应一条 `report`。  
本次需求是“报告管理模块”的删除，不应误伤会话主记录，因此逻辑删除字段建议挂在 `report` 表，而不是挂在 `conversation` 表。

## 6.2 ReportEntity 扩展字段

建议在 `report` 表新增：

```ts
deletedAt: Date | null;
deletedByAdminId: string | null;
```

含义：

- `deletedAt`
  - 报告是否被逻辑删除
- `deletedByAdminId`
  - 记录后台删除操作者

初始化默认值：

- `deletedAt = null`
- `deletedByAdminId = null`

## 6.3 管理端列表项模型

建议新增共享类型：

```ts
export interface AdminReportListItem {
  id: string;
  conversationId: string;
  title: string;
  scenarioTitle: string;
  scenarioType: ScenarioType;
  userDisplay: string;
  roleName: string;
  difficulty: PracticeDifficulty;
  score: number;
  status: ReportStatus;
  generatedAt: string;
}
```

分页响应：

```ts
export interface AdminReportListResponse {
  items: AdminReportListItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}
```

查询参数：

```ts
export interface AdminReportListQuery {
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
export interface DeleteAdminReportResponse {
  success: true;
}
```

详情响应建议直接复用：

```ts
ReportDetail;
```

这样前后端都能复用现有结构，减少重复 DTO。

## 7. API 设计

## 7.1 报告列表查询

```http
GET /api/admin/reports
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
ApiResponse<AdminReportListResponse>;
```

处理逻辑：

1. 以 `report` 为主表查询
2. 过滤 `report.deletedAt IS NULL`
3. 关联 `conversation`
4. 关联 `scenario`
5. 关联 `selectedRole`
6. 左连接 `user`
7. 左连接 `anonymousSession`
8. 按条件过滤
9. 按 `report.generatedAt DESC` 排序
10. 分页返回

## 7.2 报告详情

```http
GET /api/admin/reports/:conversationId/detail
```

或：

```http
GET /api/admin/reports/:id
```

推荐优先使用：

```http
GET /api/admin/reports/:conversationId/detail
```

原因：

- 当前用户侧 `report` 链路就是围绕 `conversationId`
- `ReportDetail` 本身也是“某次会话的报告详情”
- 能最大限度复用现有 `ReportService` 的 detail 组装逻辑

响应：

```ts
ApiResponse<ReportDetail>;
```

处理逻辑：

1. 查询会话
2. 校验该会话存在且未被软删除
3. 查询 report，校验未软删除
4. 查询 messages
5. 复用现有 `ReportDetail` 组装逻辑

## 7.3 报告逻辑删除

```http
DELETE /api/admin/reports/:id
```

这里的 `id` 建议直接使用 `report.id`。

响应：

```ts
ApiResponse<DeleteAdminReportResponse>;
```

处理逻辑：

1. 校验报告存在
2. 若已删除，返回幂等成功
3. 设置：
   - `deletedAt = now`
   - `deletedByAdminId = currentAdminId`
4. 返回 `success: true`

## 8. 后端模块设计

## 8.1 模块归属

建议能力落在现有 `apps/api/src/modules/report` 中，而不是新建平级模块。

推荐结构：

```txt
apps/api/src/modules/report/
  admin-report.controller.ts
  report.controller.ts
  report.module.ts
  report.service.ts
  dto/
    admin-report-list-query.dto.ts
```

## 8.2 职责划分

- `admin-report.controller.ts`
  - 暴露管理端报告路由
  - 使用 `AdminAccessGuard`
- `report.service.ts`
  - 提供：
    - 报告列表查询
    - 报告详情查询
    - 报告逻辑删除
  - 尽量复用现有 detail / summary 组装逻辑

建议新增方法：

- `listAdminReports(query)`
- `getDetailForAdmin(conversationId)`
- `deleteReportByAdmin(reportId, adminId)`

## 8.3 关联查询建议

列表查询需要联表：

- `report`
- `conversation`
- `scenario`
- `selectedRole`
- `user`
- `anonymousSession`

建议使用 QueryBuilder，而不是多次拆查询，以便统一过滤与分页。

## 9. 前端模块设计

## 9.1 目录组织

管理端页面代码建议放在：

```txt
apps/admin/src/features/reports/
```

推荐结构：

```txt
apps/admin/src/features/reports/
  reports-page.tsx
  reports-filter-form.tsx
  reports-table.tsx
  report-detail-dialog.tsx
  report-delete-dialog.tsx
  reports.constants.ts
  reports.types.ts
```

## 9.2 页面结构

参考 `features/scenarios` 与 `features/conversations` 的实现模式：

- `reports-page.tsx`
  - 页面状态管理
  - 查询请求
  - 详情请求
  - 删除请求
  - 分页切换
- `reports-filter-form.tsx`
  - 查询条件区
- `reports-table.tsx`
  - 报告列表展示
- `report-detail-dialog.tsx`
  - 展示 `ReportDetail`
- `report-delete-dialog.tsx`
  - 二次确认

## 9.3 共通组件复用

优先复用：

- `AdminPageToolbar`
- `AdminFormField`
- `AdminDataTable`
- `AdminPagination`
- `AdminConfirmDialog`
- `AdminModal`

不建议单独为报告详情再做一套弹窗框架。

## 9.4 页面状态

建议维护以下状态：

- `draftFilters`
- `appliedFilters`
- `data`
- `loading`
- `message`
- `detailOpen`
- `detailLoading`
- `selectedDetail`
- `deleteOpen`
- `deleteSubmitting`
- `deleteTarget`

## 10. 管理端详情弹窗结构

建议弹窗内容分区：

1. 顶部摘要区
   - 报告标题
   - 主题名
   - 状态
   - 生成时间
2. 六维评分区
3. Summary 区
4. Strengths 区
5. Issues 区
6. Suggestions 区
7. Conversation 基础信息区
8. Transcript 区

说明：

- transcript 区不需要做与 web 一样复杂的聊天气泡，只要可读性足够即可
- 重点是“内容相近”，不是“样式完全复制”

## 11. 过滤与分页规则

查询顺序建议如下：

1. 过滤已逻辑删除报告
2. 时间范围过滤
   - 基于 `conversation.startedAt`
3. 用户过滤
4. 主题名过滤
5. 类型过滤
6. 按 `report.generatedAt DESC` 排序
7. 分页切片

时间处理建议：

- `startedFrom`
  - 取当天开始时间
- `startedTo`
  - 取当天结束时间

这样和管理端 date 输入体验更一致。

## 12. 逻辑删除语义

逻辑删除后：

- 管理端默认列表不再展示该报告
- 用户侧 `apps/web` 不改代码，但相关 `report` API 若继续复用同一 service，可在后端自动排除软删除报告
- 会话 `conversation` 与消息 `message` 记录仍保留

原因：

- 本次删除的是“报告”，不是“整次会话”
- 这样符合模块职责边界

## 13. 对现有用户侧能力的影响

虽然本次不改 `apps/web`，但建议在 `apps/api` 中同步保证：

- 用户通过报告接口查询已删除报告时，应返回不存在
- 如果 `history` 页只依赖会话，不必因报告删除而移除整条会话历史
- 会话可以存在但报告为空，前端可表现为“无报告”或无法打开报告详情

因此建议：

- `report.service.ts` 中用户侧读取逻辑同时增加 `deletedAt IS NULL` 过滤

## 14. 共享类型与校验设计

## 14.1 `packages/shared-types`

建议新增：

- `AdminReportListItem`
- `AdminReportListQuery`
- `AdminReportListResponse`
- `DeleteAdminReportResponse`

详情类型建议继续复用：

- `ReportDetail`

## 14.2 `packages/shared-zod`

建议新增：

- `adminReportListItemSchema`
- `adminReportListQuerySchema`
- `adminReportListResponseSchema`
- `deleteAdminReportResponseSchema`

建议校验规则：

- `startedFrom` / `startedTo`
  - 字符串，可由 service 再做日期解析
- `userKeyword`
  - trim
  - 限制最大长度
- `title`
  - trim
  - 限制最大长度
- `page`
  - `>= 1`
- `pageSize`
  - `>= 1`
  - `<= 20`

## 15. 数据库实体扩展

当前 `ReportEntity` 需要新增：

```ts
deletedAt!: Date | null;
deletedByAdminId!: string | null;
```

建议补索引：

- `idx_report_deleted_at`

原因：

- 列表查询和逻辑删除判断都会频繁使用 `deletedAt`

## 16. 测试设计

## 16.1 API 测试

至少覆盖：

- 能按 `title` 过滤
- 能按 `type` 过滤
- 能按用户关键词过滤
- 能按时间范围过滤
- 能分页返回
- 详情接口能返回 `ReportDetail`
- 删除后默认列表不再返回该报告
- 重复删除幂等

## 16.2 Admin 页面验证

至少覆盖：

- 查询条件输入并触发请求
- 列表能按条件展示
- 分页正常
- 点 `Detail` 能打开弹窗并加载详情
- 点 `Delete` 有二次确认
- 删除成功后列表刷新

## 17. 开发顺序建议

1. `packages/shared-types` 增加报告管理共享类型
2. `packages/shared-zod` 增加 schema
3. 扩展 `ReportEntity` 软删除字段
4. 在 `report` 模块新增 admin controller 与查询 / 详情 / 删除 service
5. 在 `apps/admin/src/features/reports` 落页面
6. 将 `App.tsx` 中的 `ReportsPage` 占位页替换为真实页面
7. 增加测试并联调验证

## 18. 验收映射

- “能根据查询条件查询报告的列表”
  - 由 `GET /api/admin/reports`
  - 查询表单
  - 报告列表分页展示共同完成
- “能逻辑删除该次对话”
  - 需求文本这里应理解为“逻辑删除该次报告”
  - 由 `DELETE /api/admin/reports/:id`
  - 删除确认弹窗
  - 列表刷新完成
- “点击详情，能弹框显示报告的详情信息，和 web 端的报告内容差不多”
  - 由 `GET /api/admin/reports/:conversationId/detail`
  - 详情弹窗渲染完成

## 19. 最终结论

本次最合适的落地方式是：

- 以现有 `report` 模块为核心扩展管理端查询、详情、逻辑删除能力
- 将软删除字段挂在 `report` 表，而不是 `conversation` 表
- 在 `apps/admin/src/features/reports` 中复用现有列表页与弹窗模式完成管理界面

这样可以在不改动 `apps/web` 的前提下，快速形成一套完整的报告管理模块，并且与现有 `admin`、`report`、`conversation` 架构保持一致。
