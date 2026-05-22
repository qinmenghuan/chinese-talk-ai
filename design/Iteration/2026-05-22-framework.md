# 2026-05-22 项目框架设计

## 1. 文档目标
本文基于 [framework-design.md](D:/study-program/AI/learn-chinese-ai/design/framework-design.md) 和 [requirement-analysis.md](D:/study-program/AI/learn-chinese-ai/design/requirement-analysis.md)，输出项目首版可执行的框架设计方案。重点解决以下问题：
- Monorepo 如何拆分应用与共享包。
- C 端和管理台分别采用什么技术栈。
- 前端、后端、AI 服务、数据库之间如何协作。
- 实时语音链路、报告生成链路、历史记录链路如何落地。
- 首版框架如何兼顾开发效率、可维护性和后续扩展。

## 2. 项目定位
项目是一个面向海外中文学习者的实时中文口语练习平台，首版优先支持：
- PC 端 C 端练习站点。
- PC 端管理台。
- 实时语音输入。
- AI 语音输出与文本同步展示。
- 匿名会话。
- 会话记录保存。
- 练习结束后生成中文分析报告。

## 3. 总体技术选型
### 3.1 前端
- C 端：Next.js + TypeScript + Tailwind CSS + shadcn/ui + lucide-react
- 管理台：Vite + React + TypeScript + Tailwind CSS + shadcn/ui + lucide-react

选型理由：
- Next.js 适合 C 端页面组织、国际化扩展、未来 SEO 和全球部署。
- Vite 更适合后台管理台，启动快、配置轻、与纯前端管理页匹配。
- Tailwind CSS + shadcn/ui 能快速形成统一组件体系，并保留足够的定制空间。`lucide-react` 作为全项目统一图标库，避免 C 端和管理台出现多套 icon 风格。

### 3.1.1 UI 设计系统约束
首版 UI 规范以 [UI-design.md](D:/study-program/AI/learn-chinese-ai/design/conventions/UI-design.md) 为准，前端框架必须支持以下视觉与交互约束：
- 视觉风格采用白色主画布、深色正文、单一品牌强调色的轻量消费级界面，不走企业后台风格。
- 整体风格偏图片优先、卡片驱动、低阴影、软圆角，避免硬边框、重投影和高密度企业表格感。
- 全站图标统一使用 `lucide-react`，并通过共享 UI 组件封装尺寸、颜色和交互态。
- 页面层必须支持 PC 优先的响应式布局，并为后续移动端收缩保留栅格与断点能力。

### 3.1.2 设计 token 原则
- 色彩、圆角、阴影、间距、字号不能散落在页面中硬编码，必须沉淀为统一 token。
- Tailwind theme 负责承载基础 token，`packages/ui` 负责承载组件级 token 与组合样式。
- 业务页面只能消费语义化 token，例如 `bg-canvas`、`text-ink`、`shadow-float`、`rounded-card`，避免直接写大量原始十六进制颜色。

### 3.2 后端
- NestJS
- PostgreSQL
- Redis

选型理由：
- NestJS 适合清晰模块化拆分，如 auth-lite、conversation、report、scenario、admin。
- PostgreSQL 负责结构化业务数据。
- Redis 负责实时状态、短期缓存、限流和异步任务状态。

### 3.3 AI 能力
- 首版方案：火山引擎豆包端到端实时语音
- 报告生成：优先使用同一平台的低成本文本模型，必要时再拆分到独立文本模型

首版建议：
- 实时语音输入、语音输出和实时转写统一基于豆包端到端实时语音能力。
- 后端负责生成实时会话凭证、业务编排、消息落盘、报告生成和失败重试。
- 这样可以避免首版同时拼接 ASR + LLM + TTS 三段链路，降低接入复杂度。

## 4. 系统端划分
### 4.1 C 端 PC 网站
主要职责：
- 展示首页和练习入口。
- 选择练习场景。
- 管理麦克风权限与扬声器播放。
- 发起实时语音会话。
- 展示实时转写文本与 AI 回复。
- 会话结束后展示分析报告。
- 查看匿名历史练习记录。

### 4.2 管理台 PC 网站
主要职责：
- 管理练习场景。
- 查看用户会话与报告统计。
- 调整分析报告模板与提示词配置。
- 查看错误日志、失败任务和接口运行状态。
- 管理敏感词、系统配置和实验参数。

### 4.3 API 服务
主要职责：
- 生成实时会话所需的服务端令牌。
- 管理匿名会话与 conversation 生命周期。
- 接收并保存会话消息、报告结果和场景信息。
- 生成分析报告。
- 提供 C 端和管理台的数据接口。

## 5. Monorepo 设计
### 5.1 推荐目录结构
```text
learn-chinese-ai/
  apps/
    web/                        # Next.js C 端
    admin/                      # Vite 管理台
    api/                        # NestJS 后端
  packages/
    ui/                         # 共享 UI 组件
    design-tokens/              # 颜色、圆角、阴影、字号、间距 token
    shared-types/               # 前后端共享类型
    shared-zod/                 # zod schema 与 DTO 对齐定义
    prompts/                    # AI 提示词模板
    eslint-config/              # 共享 ESLint 配置
    tsconfig/                   # 共享 TS 配置
    utils/                      # 通用工具函数
  infra/
    docker/                     # Docker 配置
    scripts/                    # 初始化、部署、迁移脚本
  design/
    conventions/
    framework-design.md
    requirement-analysis.md
  Iteration/
    2026-05-22-framework.md
```

### 5.2 分层原则
- `apps` 只承载具体应用入口和应用内编排。
- `packages` 只放跨应用共享能力，禁止反向依赖 `apps`。
- UI 组件、schema、类型、提示词必须共享，避免 C 端、管理台、API 三处重复定义。`lucide-react` 作为默认 icon 方案，统一由前端应用和共享 UI 组件使用。
- UI 相关 token 必须先进入 `packages/design-tokens`，再由 `packages/ui` 和各前端应用消费，禁止页面级私自定义第二套主色、圆角和阴影体系。
- 业务逻辑优先放在后端与共享包，前端避免堆积难以复用的逻辑。

## 6. 应用层架构设计
### 6.1 apps/web
推荐目录：
```text
apps/web/
  app/
    (marketing)/
    (practice)/
    reports/
    history/
  components/
  features/
    conversation/
    scenario/
    report/
    history/
  lib/
    api/
    realtime/
    analytics/
  hooks/
  stores/
  styles/
```

职责边界：
- `app/` 只负责路由与页面组合。
- `features/` 负责业务组件和状态编排。
- `lib/realtime/` 负责浏览器音频、实时连接、事件适配。
- `stores/` 负责会话级状态，不承载复杂副作用。
- `styles/` 负责挂载全局 token、Tailwind 扩展和页面级布局基线，不承载零散业务样式覆盖。

UI 落地要求：
- C 端首页、练习页、报告页优先采用图片驱动和卡片式信息组织，而不是后台式面板堆叠。
- 搜索、场景选择、会话状态条、报告摘要卡都应采用柔和圆角与低阴影层级。
- 交互元素优先使用 pill、圆角按钮、轻边框输入框，避免硬矩形和过重边框。

### 6.2 apps/admin
推荐目录：
```text
apps/admin/
  src/
    pages/
    components/
    features/
      scenario/
      reports/
      system/
      metrics/
    lib/
    hooks/
    stores/
```

职责边界：
- 管理台只消费后端管理接口，不直接接入实时模型。
- 与 C 端共用 UI token、共享类型和 schema。
- 所有管理操作必须具备审计日志能力。

UI 落地要求：
- 管理台沿用同一套 token 和 icon 体系，但信息密度可以高于 C 端。
- 管理台不应复制消费端的摄影化首页风格，但仍需保持同一品牌色、圆角和输入控件语义。

### 6.3 apps/api
推荐目录：
```text
apps/api/
  src/
    modules/
      health/
      realtime/
      conversation/
      report/
      scenario/
      history/
      admin/
      system-config/
    common/
      dto/
      decorators/
      filters/
      interceptors/
      guards/
      pipes/
      logger/
      database/
      redis/
      volcengine/
    config/
    main.ts
```

模块职责：
- `realtime`：生成临时凭证、会话握手、实时能力配置。
- `conversation`：会话创建、结束、记录保存。
- `report`：报告生成、状态跟踪、重试。
- `scenario`：场景模板和难度管理。
- `history`：历史会话与报告查询。
- `admin`：管理台统计与运营接口。
- `system-config`：提示词参数、实验开关、灰度配置。

## 7. 核心业务流程设计
### 7.1 实时语音会话流程
1. 用户进入 C 端并选择练习场景。
2. 前端请求 API 创建匿名会话与 realtime session。
3. API 返回匿名会话 ID、conversation ID、豆包实时语音所需会话参数或凭证。
4. 前端建立与豆包实时语音服务的实时连接。
5. 用户语音输入后，前端接收转写增量事件并实时渲染。
6. AI 返回语音流和文本流，前端同步播放和展示。
7. 前端在会话结束时调用 API 落盘最终文本记录。
8. API 异步生成分析报告。
9. 前端跳转到报告页拉取结果。

### 7.2 报告生成流程
1. 会话结束后，API 汇总最终消息列表。
2. `report` 模块根据统一 prompt 模板生成结构化报告。
3. 报告结果存储到 PostgreSQL。
4. 若生成失败，则记录失败状态并允许管理台重试。

### 7.3 历史记录流程
1. 匿名用户通过本地 visitor token 或 device token 查询自己的历史记录。
2. API 根据匿名会话标识返回历史会话列表。
3. 用户进入详情页查看转写文本与分析报告。

## 8. 数据架构设计
### 8.1 核心实体
- `anonymous_session`
- `conversation`
- `message`
- `report`
- `practice_scenario`
- `system_prompt_template`
- `admin_audit_log`

### 8.2 推荐表关系
- 一个 `anonymous_session` 对应多个 `conversation`。
- 一个 `conversation` 对应多个 `message`。
- 一个 `conversation` 对应一个 `report`。
- 一个 `practice_scenario` 可被多个 `conversation` 引用。

### 8.3 PostgreSQL 负责的数据
- 匿名会话主数据。
- 场景配置。
- 最终消息记录。
- 分析报告。
- 管理配置与审计日志。

### 8.4 Redis 负责的数据
- 实时会话状态。
- 报告生成任务状态。
- 限流计数。
- 高频配置缓存。
- 临时幂等 key。

## 9. API 设计原则
### 9.1 BFF/API 职责边界
- C 端和管理台统一走 API，不允许直接读数据库。
- API 负责 DTO 校验、zod schema 对齐、鉴权、幂等和日志。
- 前端与实时语音服务的交互只限语音链路，其余业务数据仍通过 API。

### 9.2 接口分类
- C 端接口：创建会话、结束会话、获取报告、获取历史记录。
- 管理台接口：场景管理、报告统计、失败任务重试、系统配置更新。
- 内部接口：健康检查、任务回调、队列消费。

### 9.3 DTO 与 schema 策略
- NestJS Controller 入参必须使用 DTO。
- 共享请求响应结构必须在 `packages/shared-zod` 和 `packages/shared-types` 中维护。
- DTO 与 zod schema 命名必须一一对应，避免前后端协议漂移。

## 10. 实时语音架构设计
### 10.1 首版推荐模式
- 前端连接火山引擎豆包端到端实时语音服务。
- API 负责生成实时会话凭证、拼装场景配置和持久化业务数据。

这样做的好处：
- 实时语音链路完整，不需要首版自己拼接 ASR、LLM、TTS。
- 比三段式组合方案更容易做出低延迟连续对话体验。
- 运行成本低于 OpenAI，更符合当前成本优先的决策。

### 10.2 前端实时模块拆分
- `audio-capture`：麦克风采集、权限判断、设备切换。
- `realtime-client`：实时连接、事件监听、断线重连。
- `transcript-adapter`：增量转写与最终文本合并。
- `audio-playback`：AI 音频播放与可打断控制。
- `conversation-store`：会话状态和 UI 展示状态。

### 10.2.1 UI 组件分层建议
- `packages/ui` 提供按钮、输入框、卡片、badge、dialog、sheet、tooltip、empty-state、skeleton 等通用组件。
- `apps/web/features` 组合业务组件，如 `ScenarioCard`、`ConversationPanel`、`TranscriptStream`、`ReportSummaryCard`。
- 图标统一从 `lucide-react` 导出后再通过本地包装组件使用，避免页面内直接散落不同尺寸和描边风格。

### 10.2.2 视觉实现原则
- 默认页面画布采用浅色背景，正文使用深色文本，品牌强调色只用于关键 CTA、选中态和少量高优先级反馈。
- 卡片圆角、按钮圆角、输入框圆角要统一收敛，避免每个模块各自定义。
- 阴影层级控制在 0 到 1 个主层级之间，主要通过边框、留白、圆角和内容层次建立秩序。
- 字体层级要比典型 SaaS 更克制，页面视觉重量更多交给场景卡片、会话面板和内容编排，而不是超大标题。

### 10.3 后端实时模块拆分
- `volcengine-auth`：生成豆包实时语音所需的鉴权信息。
- `realtime-session`：创建和管理实时会话上下文。
- `realtime-message-sync`：在会话结束时归档最终消息。
- `realtime-observer`：采集会话耗时、失败率和异常日志。

### 10.4 风险控制
- 会话超时自动结束。
- 前端在本地维护最终文本快照，防止接口失败导致记录丢失。
- 重要状态切换记录日志，便于排查音频链路问题。
- 需重点验证海外访问豆包实时语音时的跨境时延与稳定性。

## 11. 管理台设计
### 11.1 首版必须支持的后台模块
- 场景管理。
- 报告结果查看。
- 会话记录检索。
- 模型调用错误日志查看。
- 系统配置与 prompt 模板管理。

### 11.2 后台不建议首版支持的功能
- 复杂 RBAC 权限系统。
- 多组织管理。
- 财务与付费后台。
- 自动化运营编排。

## 12. 部署架构设计
### 12.1 推荐部署组合
- `apps/web` -> Vercel
- `apps/admin` -> Vercel 或独立静态托管
- `apps/api` -> Railway 或 Render
- PostgreSQL -> Railway Postgres / Render Postgres / Neon
- Redis -> Upstash Redis

### 12.2 环境划分
- `local`：本地开发环境
- `staging`：联调与测试环境
- `production`：正式环境

### 12.3 环境变量分层
- 应用级：`NEXT_PUBLIC_*`、`VITE_*`、`API_PORT`
- 数据级：`DATABASE_URL`、`REDIS_URL`
- 第三方级：`VOLCENGINE_ACCESS_KEY`、`VOLCENGINE_SECRET_KEY`、`DOUBAO_REALTIME_APP_ID`、`DOUBAO_REALTIME_MODEL`
- 系统级：`LOG_LEVEL`、`NODE_ENV`

## 13. 安全与合规设计
- 匿名体验不等于无控制，必须对 visitor token 做签名或随机化处理。
- 管理台接口必须独立鉴权。
- 不保存原始音频，降低隐私风险。
- 日志中禁止输出完整 token、完整用户文本原文和敏感配置。
- 报告生成相关 prompt 和模型返回需保留最小必要审计信息。

## 14. 可扩展性设计
### 14.1 第二阶段可扩展方向
- 登录体系与学习档案。
- 更细粒度的评分体系。
- 更丰富的练习场景。
- 多语言引导页。
- 付费订阅与额度控制。

### 14.2 首版必须为后续预留的能力
- 场景配置表独立。
- 报告评分字段结构化。
- API 保留版本化空间，如 `/v1`。
- 共享 schema 与 types 单独抽包。
- 为后续切换或并行接入第二套语音服务预留 provider 抽象层。

## 15. 首版开发建议
### 15.1 第一优先级
- Monorepo 初始化。
- `apps/web` 基础页面和实时语音链路。
- `apps/api` 的 realtime、conversation、report 模块。
- PostgreSQL 和 Redis 初始化。
- 完成豆包实时语音鉴权和会话建立的最小闭环。

### 15.2 第二优先级
- 管理台基础壳子。
- 场景管理页。
- 历史记录与报告页。
- 错误日志与失败任务重试能力。
- 海外网络质量与延迟监控。

### 15.3 不要在首版做的事
- 复杂账号体系。
- 过早抽象微服务。
- 过度设计权限系统。
- 自建底层音视频转发服务。

## 16. 结论
该项目首版最适合采用 Monorepo 架构，由 `web + admin + api + shared packages` 组成。C 端使用 Next.js，管理台使用 Vite，后端使用 NestJS，实时语音能力优先采用火山引擎豆包端到端实时语音，数据层使用 PostgreSQL + Redis。

这个方案的关键优点是：
- 业务边界清晰。
- 首版复杂度可控。
- 共享协议和组件可复用。
- 实时语音链路比三段式组合方案更容易落地。
- 对后续登录体系、付费、精细评分和多场景扩展友好。

当前方案的主要注意点是：
- 成本优于 OpenAI，但不是最低的三段式组合成本。
- 海外用户访问火山引擎实时语音服务的稳定性必须尽早验证。
- 为后续多 provider 预留抽象层是必要的工程准备。
