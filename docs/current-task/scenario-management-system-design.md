# 对话场景管理模块系统设计文档

## 1. 文档说明

- 目标：基于 `docs/current-task/current-task.md` 的需求，为“对话场景管理模块”提供一份可直接指导开发的系统设计文档。
- 范围：仅覆盖 `apps/admin`、`apps/api` 以及必要的共享包设计。
- 不包含：
  - `apps/web` 改动
  - 真实数据库迁移脚本的具体实现
  - 最终视觉稿
- 设计原则：
  - 保持 Monorepo 边界清晰
  - 优先复用现有管理端公共组件模式
  - 管理端场景模块相关业务代码统一放在 `features/scenarios`
  - 不假设项目已具备完整生产数据层，但设计要能平滑落地

## 2. 需求摘要

本次需要新增“对话场景管理模块”，支持管理端对对话主题进行查询、新增、编辑、删除，并初始化一批旅游类低难度数据。

### 2.1 功能范围

- 查询功能
  - 查询条件：主题名、难度、类型
  - 查询结果分页加载
  - 每页 20 条
- 新增对话主题
- 编辑对话主题
- 删除对话主题
  - 删除前二次确认
  - 删除后刷新列表
- 初始化数据
  - 类型：旅游
  - 难度：低
  - 主题：
    - 买飞机票
    - 买衣服
    - 交朋友
    - 餐厅点餐
    - 买水果
    - 约朋友周末吃饭
    - 买火车票

### 2.2 UI / 交互约束

- 查询框、列表、分页、二次确认弹框、新增编辑表单都应使用公共组件
- 如果当前缺少对应公共组件，应先抽到管理端共用组件

## 3. 当前系统现状与设计判断

根据仓库现状，可以做出以下合理判断：

- `apps/admin` 已经具备管理台壳子与若干页面结构
- `apps/api` 已存在 `scenario` 相关模块或基础骨架
- 当前“对话场景”能力更像静态或半静态骨架，尚未形成完整的后台管理闭环
- 本次工作本质上是在现有 `scenario` 能力上补齐一套标准管理 CRUD

因此本次设计建议：

- 后端继续围绕 `scenario` 领域扩展，不新增平行概念
- 管理端新增一个标准列表页 + 编辑弹框方案
- 共享类型、查询 DTO、分页结构放入共享包统一维护

## 4. 设计目标

- 为对话场景提供标准的管理端 CRUD 能力
- 避免页面中直接堆叠复杂交互，优先沉淀可复用组件
- 保持 API 协议、共享类型、管理端表单字段一致
- 初始化数据具备可重复执行策略，避免重复插入
- 后续便于扩展更多场景类型、更多难度等级、更多字段

## 5. 总体方案

整体采用“管理端列表页 + API 场景管理接口 + 共享类型约束 + 初始化种子数据”的方案。

### 5.1 模块拆分

- `apps/admin`
  - 新增/完善对话场景管理页面
  - 查询表单
  - 列表表格
  - 分页器
  - 删除确认
  - 新增/编辑弹框
- `apps/api`
  - 提供场景管理查询、新增、编辑、删除接口
  - 提供初始化默认场景数据的种子逻辑
- `packages/shared-types`
  - 提供场景实体、列表查询参数、分页响应、创建/更新请求类型
- `packages/shared-zod`
  - 提供创建/编辑/查询参数 schema

### 5.2 代码组织约束

为了避免管理端业务代码分散，本次“对话场景管理模块”相关代码统一收敛到 `features/scenarios`。

建议目录边界如下：

- `apps/admin/src/features/scenarios`
  - 放场景模块业务代码
  - 包括页面、列表、筛选、弹框、表单、hooks、类型适配、页面级常量
- `apps/admin/src/components/admin`
  - 放管理端通用组件
  - 只承载跨模块复用的通用 UI 容器和交互壳子

具体建议结构：

```text
apps/admin/src/features/scenarios/
  scenarios-page.tsx
  scenarios-filter-form.tsx
  scenarios-table.tsx
  scenario-edit-dialog.tsx
  scenario-edit-form.tsx
  scenario-delete-dialog.tsx
  scenarios.types.ts
  scenarios.constants.ts
```

说明：

- 只要是“场景模块专属”的代码，即使它表现为一个组件，也应优先放在 `features/scenarios`
- 只有当一个组件明确可以跨多个管理模块复用时，才提升到 `components/admin`
- 页面路由入口可以在 `App.tsx` 或路由配置中挂接，但真正业务实现仍放在 `features/scenarios`

### 5.3 页面模式

管理端页面采用标准三段式布局：

1. 页面标题区
2. 查询筛选区
3. 表格列表区

新增和编辑统一使用同一个弹框表单组件，通过“是否带 id / 初始值”区分模式。

## 6. 数据模型设计

## 6.1 场景核心模型

建议对“对话场景”统一抽象为 `Scenario`。

建议字段如下：

- `id: string`
- `title: string`
  - 主题名称
  - 例如：`买飞机票`
- `type: ScenarioType`
  - 场景类型
  - 本次至少包含：`travel`
- `difficulty: ScenarioDifficulty`
  - 难度
  - 本次至少包含：`beginner`
- `imageUrl: string`
  - 主题图片链接
- `status: "active" | "disabled"`
  - 建议预留状态字段，便于后续扩展上下线能力
- `createdAt: string`
- `updatedAt: string`

### 6.2 枚举定义

建议统一内部枚举值：

- `ScenarioType`
  - `travel`
  - 后续可扩展：`daily`、`workplace`、`social`、`shopping`
- `ScenarioDifficulty`
  - `beginner`
  - `intermediate`
  - `advanced`

管理端展示层再做中文映射：

- 类型：
  - `travel -> 旅游`
- 难度：
  - `beginner -> 低`
  - `intermediate -> 中`
  - `advanced -> 高`

### 6.3 为什么建议保留状态字段

虽然本次需求没有要求“启用/停用场景”，但保留 `status` 有几个好处：

- 后续可以不通过物理删除完成上下线
- Web 端将来可以过滤只展示 `active` 场景
- 可以减少误删造成的数据不可恢复问题

如果当前项目阶段不想引入 `status`，也可以先不落库，但共享类型层建议预留扩展空间。

## 7. API 设计

接口建议挂在管理端鉴权域下，例如：

- `GET /admin/scenarios`
- `POST /admin/scenarios`
- `PATCH /admin/scenarios/:id`
- `DELETE /admin/scenarios/:id`

如果项目当前 `scenario` 模块已存在前台接口，可通过管理前缀区分后台管理能力，避免语义混用。

## 7.1 查询接口

### 请求

`GET /admin/scenarios`

查询参数：

- `title?: string`
- `type?: ScenarioType`
- `difficulty?: ScenarioDifficulty`
- `page?: number`
- `pageSize?: number`

约束：

- 默认 `page = 1`
- 默认 `pageSize = 20`
- 当前固定每页 20 条，前端可直接传 20，后端也应兜底

### 响应

```ts
type AdminScenarioListResponse = {
  items: Scenario[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
```

### 查询规则

- `title` 使用模糊匹配
- `type` 使用精确匹配
- `difficulty` 使用精确匹配
- 排序建议默认按 `updatedAt desc, createdAt desc`

## 7.2 新增接口

### 请求

`POST /admin/scenarios`

```ts
type CreateScenarioRequest = {
  title: string;
  type: ScenarioType;
  difficulty: ScenarioDifficulty;
  imageUrl: string;
};
```

### 校验规则

- `title`
  - 必填
  - 去首尾空格
  - 长度建议 1~50
- `type`
  - 必填
  - 必须是合法枚举
- `difficulty`
  - 必填
  - 必须是合法枚举
- `imageUrl`
  - 必填
  - 必须为合法 URL 字符串

### 响应

返回新建后的完整场景对象。

## 7.3 编辑接口

### 请求

`PATCH /admin/scenarios/:id`

```ts
type UpdateScenarioRequest = {
  title: string;
  type: ScenarioType;
  difficulty: ScenarioDifficulty;
  imageUrl: string;
};
```

说明：

- 本次需求是标准编辑表单，建议直接按全量字段更新
- 如果团队更偏好 patch 语义，也可支持部分字段更新，但前端仍可按全量提交

### 响应

返回更新后的完整场景对象。

## 7.4 删除接口

### 请求

`DELETE /admin/scenarios/:id`

### 行为

- 如果记录不存在，返回 404
- 删除成功返回：

```ts
type DeleteScenarioResponse = {
  success: true;
};
```

### 删除策略

本次优先建议使用物理删除，因为需求明确要求“删除”。

但应额外注意：

- 如果将来有用户练习记录、报告记录依赖 `scenarioId`
- 需要评估直接删除是否会破坏历史数据关联

因此更稳妥的长期建议是：

- 当前阶段可先物理删除
- 若后续存在强依赖，再升级为软删除或状态下线

## 8. 管理端页面设计

## 8.1 页面结构

建议页面路径：

- `/scenarios`

页面结构：

1. 标题区
   - 页面标题：`对话场景`
   - 右侧主按钮：`新增场景`
2. 查询区
   - 主题名输入框
   - 难度下拉框
   - 类型下拉框
   - 查询按钮
   - 重置按钮
3. 列表区
   - 表格
   - 空状态
   - 分页

## 8.2 查询区设计

查询区字段：

- 主题名
- 难度
- 类型

行为约定：

- 点击查询
  - 重置到第一页
  - 请求最新列表
- 点击重置
  - 清空筛选项
  - 回到第一页
  - 刷新列表

建议将查询区抽成通用的管理端筛选条组合方式，便于后续其他管理页复用。

## 8.3 列表区设计

表格列建议如下：

- 主题名
- 类型
- 难度
- 图片链接
- 更新时间
- 操作

其中：

- 图片链接列
  - 可展示简短文本
  - 或展示“查看图片”外链按钮
  - 不建议直接在表格中渲染大图，避免影响管理效率
- 操作列
  - 编辑
  - 删除

## 8.4 新增 / 编辑弹框

建议使用统一组件 `ScenarioEditDialog`。

字段：

- 主题名
- 类型
- 难度
- 图片链接

模式：

- 新增模式
  - 标题：`新增场景`
  - 初始值为空
- 编辑模式
  - 标题：`编辑场景`
  - 带入当前记录

提交行为：

- 前端先做基础校验
- 成功后关闭弹框
- 刷新列表
- 如果当前页仍包含该数据，列表展示应同步更新

## 8.5 删除确认

删除前弹出二次确认框。

确认文案建议：

- 标题：`确认删除该场景？`
- 正文：`删除后不可恢复，请确认是否继续。`

交互规则：

- 点击确认后调用删除接口
- 删除成功后刷新当前页
- 如果当前页被删空且页码大于 1，应自动回退到上一页

## 9. 共享类型与校验设计

## 9.1 `packages/shared-types`

建议新增或补充：

```ts
export type ScenarioType = "travel" | "daily" | "workplace" | "social" | "shopping";

export type ScenarioDifficulty = "beginner" | "intermediate" | "advanced";

export type Scenario = {
  id: string;
  title: string;
  type: ScenarioType;
  difficulty: ScenarioDifficulty;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminScenarioListQuery = {
  title?: string;
  type?: ScenarioType;
  difficulty?: ScenarioDifficulty;
  page?: number;
  pageSize?: number;
};

export type CreateScenarioRequest = {
  title: string;
  type: ScenarioType;
  difficulty: ScenarioDifficulty;
  imageUrl: string;
};

export type UpdateScenarioRequest = CreateScenarioRequest;

export type AdminScenarioListResponse = {
  items: Scenario[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
```

## 9.2 `packages/shared-zod`

建议新增：

- `scenarioTypeSchema`
- `scenarioDifficultySchema`
- `adminScenarioListQuerySchema`
- `createScenarioSchema`
- `updateScenarioSchema`

校验重点：

- 字符串 trim
- URL 合法性
- 分页参数数字化与边界限制

## 10. Admin 公共组件抽取建议

根据需求，“查询框、列表、分页、二次确认弹框、新增编辑表单都用公共组件”，建议按下面方式组织：

## 10.1 可直接复用现有组件

优先检查并复用现有管理端公共组件，例如：

- 页面工具栏
- 数据表格容器
- 通用弹框
- 表单字段容器

## 10.2 建议补充的公共组件

如果当前缺失，建议新增：

- `admin-filter-form`
  - 管理端标准筛选区外壳
- `admin-pagination`
  - 标准分页器
- `admin-confirm-dialog`
  - 删除确认通用组件
- `scenario-edit-form`
  - 业务表单本身仍可放在 `features/scenarios`

### 组件边界建议

通用组件放：

- `apps/admin/src/components/admin`

业务组件放：

- `apps/admin/src/features/scenarios`

这样可以避免把场景专属字段逻辑污染通用组件层。

补充约束：

- `scenarios-page.tsx`
  - 作为场景模块页面入口，放在 `features/scenarios`
- `scenarios-filter-form.tsx`
  - 即使使用了通用筛选壳组件，业务筛选字段本身仍放在 `features/scenarios`
- `scenarios-table.tsx`
  - 表格列定义、操作按钮装配放在 `features/scenarios`
- `scenario-edit-dialog.tsx` / `scenario-edit-form.tsx`
  - 作为场景专属表单组件，放在 `features/scenarios`
- `scenario-delete-dialog.tsx`
  - 如果只是对通用确认弹框做业务包装，也建议留在 `features/scenarios`

结论是：

- 通用能力进 `components/admin`
- 场景模块业务装配代码全部进 `features/scenarios`

## 11. API 模块内部设计建议

## 11.1 Controller

建议新增管理端场景控制器，例如：

- `AdminScenariosController`

职责：

- 解析查询参数
- 调用 service
- 返回标准响应

## 11.2 Service

建议新增：

- `AdminScenariosService`

职责：

- 列表查询
- 新增
- 编辑
- 删除
- 初始化默认数据

## 11.3 Repository / 数据访问层

如果当前项目已有实体层或 repository 模式，建议延续现有风格：

- `ScenarioEntity`
- `ScenarioRepository`

如果当前还是内存/假数据阶段，也建议把“场景数据访问”集中到单独模块，避免 Controller 直接操作数组或 mock。

## 12. 初始化数据设计

## 12.1 初始化数据内容

初始化插入以下 7 条数据：

- 类型：`travel`
- 难度：`beginner`

主题：

1. 买飞机票
2. 买衣服
3. 交朋友
4. 餐厅点餐
5. 买水果
6. 约朋友周末吃饭
7. 买火车票

每条记录都需要：

- 默认图片链接
- 创建时间
- 更新时间

## 12.2 初始化策略

建议使用“幂等插入”：

- 以 `title + type + difficulty` 作为业务唯一识别条件
- 如果已存在则跳过，不重复创建

这样好处是：

- 可重复执行
- 不会产生重复种子数据
- 便于开发环境多次初始化

## 12.3 默认图片链接策略

由于当前需求要求图片链接通过文本框输入，初始化数据也应提供默认链接值。

建议：

- 使用稳定的公开图片 URL 仅作开发示例
- 或使用项目内部静态资源地址

长期更推荐：

- 后续由管理端自行维护图片链接
- 初始化数据只提供演示占位

## 13. 错误处理与交互反馈

## 13.1 后端错误

建议统一处理以下情况：

- 查询参数非法：400
- 新增参数非法：400
- 编辑目标不存在：404
- 删除目标不存在：404
- 唯一性冲突（如果未来要求去重）：409

## 13.2 前端反馈

建议在管理端提供标准反馈：

- 查询失败：列表区错误提示
- 保存失败：弹框内错误提示
- 删除失败：全局 toast 或弹框提示
- 删除成功：toast + 刷新列表
- 保存成功：toast + 关闭弹框 + 刷新列表

## 14. 安全与权限

虽然需求未展开权限细节，但本模块默认属于管理端能力，因此应默认受管理端登录态保护。

建议：

- 所有 `/admin/scenarios*` 接口都要求管理员身份
- 非管理员或未登录请求直接拒绝

## 15. 开发顺序建议

建议按下面顺序推进：

1. 定义共享类型与 zod schema
2. 定义 API 协议与 DTO
3. 完成后端列表/新增/编辑/删除能力
4. 完成初始化种子逻辑
5. 抽管理端公共筛选 / 分页 / 确认组件（若缺失）
6. 完成 `/scenarios` 页面
7. 联调与验证

## 16. 验证方案

完成后应至少验证以下内容：

### 16.1 查询

- 按主题名查询
- 按类型查询
- 按难度查询
- 组合条件查询
- 分页切换
- 每页 20 条

### 16.2 新增

- 可新增完整场景
- 图片链接可保存
- 新增后列表可见

### 16.3 编辑

- 可回填已有数据
- 可修改主题名、类型、难度、图片链接
- 保存后列表更新

### 16.4 删除

- 删除前有二次确认
- 删除后刷新列表
- 边界页码正确回退

### 16.5 初始化数据

- 首次执行能插入 7 条旅游低难度场景
- 重复执行不会重复插入

### 16.6 公共组件复用

- 查询框、列表、分页、确认弹框、表单均为公共模式或公共组件

## 17. 结论

本次“对话场景管理模块”最合适的落地方式是：

- 后端在 `scenario` 领域内补齐标准管理 CRUD
- 管理端按标准列表页模式实现查询、分页、新增、编辑、删除
- 共享类型与校验集中管理
- 初始化数据采用幂等种子策略
- 通用交互能力优先沉淀为管理端公共组件

这样既能满足当前需求，也能为后续继续扩展更多场景类型、更多后台管理能力打下统一基础。
