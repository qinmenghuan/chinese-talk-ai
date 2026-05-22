# 代码规范

## 1. 目标
本规范适用于 `learn-chinese-ai` Monorepo 下的 C 端、管理台、后端 API 与共享包，目标是保证：
- 代码风格统一。
- 类型边界清晰。
- API 协议稳定。
- 可读性和可维护性优先。
- 首版开发速度与长期质量平衡。

## 2. 通用原则
- 默认使用 TypeScript。
- TypeScript 必须开启严格模式。
- 优先可读性，避免为了炫技牺牲理解成本。
- 禁止重复定义协议、枚举、状态值和校验规则。
- 所有公共能力必须先考虑是否应抽到共享包。
- 新增代码必须遵守 ESLint 规则，不允许通过关闭规则掩盖问题。

## 3. 命名规范
### 3.1 文件与目录
- 目录名使用 `kebab-case`。
- React 组件文件使用 `PascalCase.tsx`。
- 普通工具文件使用 `kebab-case.ts`。
- NestJS 模块文件遵循 `*.module.ts`、`*.service.ts`、`*.controller.ts`、`*.repository.ts`、`*.dto.ts`。
- zod schema 文件建议使用 `*.schema.ts`。

### 3.2 代码标识符
- 变量、函数使用 `camelCase`。
- 类、类型、接口、枚举使用 `PascalCase`。
- 常量使用 `UPPER_SNAKE_CASE`，仅用于真正不变的全局常量。
- 布尔值变量必须使用可读前缀，如 `is`、`has`、`can`、`should`。

## 4. TypeScript 规范
- `strict` 必须为 `true`。
- 禁止使用 `any`，确有必要时优先使用 `unknown`，并在边界处缩小类型。
- 禁止滥用类型断言 `as`；只有在明确掌握运行时结构时才允许使用。
- 优先使用精确联合类型，而不是宽泛字符串。
- 导出的函数、类方法、公共 hooks 必须显式声明返回类型。
- 共享协议类型必须统一放在 `packages/shared-types`。

## 5. API 与数据协议规范
- 所有 API 必须使用 DTO + zod。
- Controller 入参必须走 DTO，不允许直接接裸对象。
- 前后端共享的请求和响应结构必须同时维护：
  - zod schema 放在 `packages/shared-zod`
  - TypeScript type 放在 `packages/shared-types`
- DTO 命名统一使用 `CreateXxxDto`、`UpdateXxxDto`、`QueryXxxDto`、`ResponseXxxDto`。
- API 返回结构必须统一，例如：`{ code, message, data }`。
- 任何 breaking change 都必须同步更新 schema、type 和文档。

## 6. React 与前端规范
### 6.1 组件设计
- 单个组件只负责一个明确职责。
- 展示型组件与业务型组件分离。
- 大页面优先拆为 `features` 内的业务组件，不要把逻辑全部堆到 `page.tsx`。
- 共享组件优先放 `packages/ui`，业务组件保留在各自应用内。

### 6.2 状态管理
- 页面局部状态优先使用 React state。
- 会话级跨组件状态使用 Zustand 或统一 store。
- 禁止把所有状态都塞进全局 store。
- 异步副作用应放在 hooks 或 service 层，不要直接散落在 UI JSX 中。

### 6.3 Hooks 规范
- 自定义 hooks 必须以 `use` 开头。
- hooks 必须只处理一类逻辑，例如会话连接、音频采集、报告加载。
- hooks 不得隐式依赖页面结构。
- 复杂 hooks 应返回结构化对象，而不是长参数列表。

### 6.4 样式规范
- 统一使用 Tailwind CSS。
- 优先使用 design token 和语义化 class 组合，不要堆砌难懂的原子类。
- 禁止在多个页面复制同样的 class 组合，应提炼为组件或工具函数。
- shadcn/ui 组件允许定制，但禁止直接改坏其可访问性语义。

## 7. NestJS 与后端规范
### 7.1 模块设计
- 每个业务模块必须围绕明确领域建模，如 `conversation`、`report`、`scenario`。
- Controller 只负责接收请求、调用 service、返回响应。
- Service 负责业务逻辑，不负责 HTTP 细节。
- Repository 或数据访问层负责数据库查询，避免把复杂 SQL 混入 service。

### 7.2 DTO 与校验
- 入参必须显式校验。
- DTO 只定义接口边界，不承载业务逻辑。
- zod schema 与 DTO 含义必须一致。
- 校验失败必须返回可理解错误信息，不能只抛出模糊异常。

### 7.3 错误处理
- 不允许直接把底层异常原样抛给前端。
- 所有业务异常必须转换为明确的 domain error 或 HTTP exception。
- 关键链路必须打日志，包括会话创建、会话结束、报告生成失败、模型调用失败。

## 8. 数据库规范
- 表名统一使用 `snake_case` 复数或约定统一的单数风格，整个项目保持一致。
- 字段名统一使用 `snake_case`。
- 主键统一使用 `id`。
- 所有表必须包含时间字段，如 `created_at`、`updated_at`。
- 软删除若使用，统一使用 `deleted_at`。
- 枚举类字段必须控制取值范围，避免裸字符串四处散落。
- schema 变更必须通过 migration 管理，不允许生产环境依赖 `synchronize`。

## 9. Redis 与缓存规范
- Redis key 必须有统一前缀，如 `lcai:conversation:{id}`。
- 所有缓存 key 必须定义 TTL 策略。
- Redis 只放临时态、缓存态、幂等态，不存最终业务主数据。
- 操作 Redis 的工具函数必须集中封装，禁止字符串 key 在业务代码里到处拼接。

## 10. 日志与可观测性规范
- 使用统一 logger 封装。
- 日志字段尽量结构化，例如 `conversationId`、`scenarioType`、`requestId`。
- 禁止输出密钥、完整 token、数据库密码、完整用户敏感文本。
- 错误日志必须带上下文，但不得泄露隐私。
- 外部服务调用必须记录耗时、结果状态和失败原因。

## 11. 测试规范
- 纯函数和关键工具优先写单元测试。
- 关键业务流程至少应有集成测试，如创建会话、结束会话、生成报告。
- 修复线上 bug 时，优先补对应测试。
- 对实时链路难以全自动化的部分，至少保留手工验证清单。

## 12. 环境变量规范
- 所有环境变量必须集中管理并在启动时校验。
- 前端暴露变量必须以 `NEXT_PUBLIC_` 或 `VITE_` 前缀区分。
- 禁止在代码中硬编码第三方密钥、URL 或数据库连接串。
- `.env.example` 必须与真实运行所需变量保持同步。

## 13. 依赖管理规范
- 新增依赖前必须判断是否已有现成能力可复用。
- 能用平台或框架原生能力解决的问题，优先不加包。
- 共享依赖版本统一在 Monorepo 管理，避免多个应用版本漂移。
- 废弃依赖要及时清理。

## 14. Git 与提交规范
- 一个提交只做一类事情。
- 提交信息建议使用 `type(scope): summary` 结构。
- 常用 `type` 包括：`feat`、`fix`、`refactor`、`docs`、`test`、`chore`。
- 禁止把格式化噪音和业务改动混在超大提交里。

## 15. 文档规范
- 新增模块时，至少补充模块说明、输入输出、边界职责。
- 新增重要接口时，必须同步更新接口文档或 schema 文档。
- Prompt 模板、评分规则、场景配置等非代码资产，也必须纳入版本管理。

## 16. 首版特别约束
- 不为未来不存在的问题做过度抽象。
- 不提前拆微服务。
- 不在首版引入复杂 DDD 分层。
- 能通过共享包解决的问题，不要复制粘贴。
- 能通过清晰命名解决的问题，不要制造额外框架。

## 17. 最低落地要求
所有新代码至少满足以下条件：
- 能通过 ESLint。
- 类型检查通过。
- DTO 和 zod 校验完整。
- 没有 `any` 滥用。
- 关键流程具备日志。
- 涉及共享协议时已同步更新 shared schema 和 types。
