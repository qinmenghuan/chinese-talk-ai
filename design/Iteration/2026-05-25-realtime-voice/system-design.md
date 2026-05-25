# 2026-05-25 实时语音系统设计方案

## 1. 文档目标

本文基于以下文档输出“practice 页面中文实时语音对话”能力的可执行系统设计方案：

- [reqirement.md](D:/study-program/AI/learn-chinese-ai/design/Iteration/2026-05-25-realtime-voice/reqirement.md)
- [2026-05-22-framework.md](D:/study-program/AI/learn-chinese-ai/design/Iteration/2026-05-22-framework.md)
- [code-conventions.md](D:/study-program/AI/learn-chinese-ai/design/conventions/code-conventions.md)
- [UI-design.md](D:/study-program/AI/learn-chinese-ai/design/conventions/UI-design.md)

本文重点回答：

- 如何在现有 Monorepo 架构中接入豆包新版实时语音。
- 首页场景跳转、practice 实时会话、history 历史记录、report 报告导出如何打通。
- 前端、后端、数据库、Redis、实时语音服务之间的职责边界如何划分。
- 首版应做哪些能力，哪些能力先留扩展口，不在首版过度实现。

## 2. 需求摘要

本次需求的核心是：为海外中文学习者提供“基于主题场景和角色设定的中文实时语音练习”，并在会话结束后生成中文分析报告，支持历史记录查询。

明确目标：

- 从首页点击主题卡片进入 `practice` 页面，并携带场景参数。
- 用户点击麦克风后可与 AI 进行中文实时语音对话。
- 对话中实时显示用户和 AI 的文本内容。
- 支持暂停、重新说、音量调节。
- 对话结束后生成中文分析报告，并支持导出 PDF。
- 会话记录和报告入库，可在 `history` 页面查看。

## 3. 设计范围

### 3.1 本次纳入范围

- 首页到 `practice` 页的场景跳转和参数透传。
- `practice` 页实时语音交互。
- 豆包实时语音会话创建、鉴权、连接参数生成。
- 对话转写文本保存。
- 会话结束后生成中文分析报告。
- `history` 页面历史记录查询。
- `report` 页面报告展示与 PDF 导出。

### 3.2 本次不纳入范围

- 复杂登录体系。
- 多用户权限与后台运营工作台增强。
- 原始音频长期存储。
- 多 Provider 动态切换。
- 自动评分校准、教师批注、多轮作业体系。

## 4. 总体方案

### 4.1 方案概述

沿用现有 `web + api + shared packages` 的 Monorepo 架构，采用“前端直接接入豆包实时语音服务，后端负责业务会话编排和数据持久化”的模式。

高层链路如下：

1. 首页选择主题场景。
2. 跳转 `practice` 页面并带上 `scenarioType`、`roleId` 等参数。
3. 前端调用 `api/realtime/session` 创建业务会话。
4. API 生成本次实时语音所需的 provider 参数，并创建业务 `conversation`。
5. 前端与豆包实时语音服务建立连接。
6. 用户说话，前端实时渲染用户转写；AI 返回语音流和文本流，前端同步播放和显示。
7. 用户结束会话后，前端将最终转写文本提交给 API。
8. API 保存消息记录并触发报告生成。
9. 用户跳转报告页查看结果，并可导出 PDF。
10. `history` 页面根据匿名会话标识查询历史会话。

### 4.2 方案选择理由

- 符合现有框架文档中“豆包端到端实时语音”为首版主方案的决策。
- 实时链路简单，前端不用自己拼 ASR、LLM、TTS。
- 保持 API 仍为业务中枢，避免前端和数据库耦合。
- 易于后续扩展场景模板、报告模板、角色设定和历史记录能力。

## 5. 业务设计

### 5.1 场景模式

首版支持两类模式：

- 主题场景模式：如酒店入住、面试自我介绍、点咖啡。
- 自由聊天模式：没有场景参数时，默认进入自由聊天。

### 5.2 角色设定

每个场景下允许用户选择或默认分配角色，例如：

- 酒店入住：用户是住客，AI 是前台。
- 面试自我介绍：用户是候选人，AI 是面试官。
- 点咖啡：用户是顾客，AI 是店员。

角色设定不应只存在前端文案中，必须进入场景配置数据层，用于：

- 创建实时会话时拼装系统提示。
- 报告生成时理解对话任务目标。
- 后续做多角色、多难度、多教学风格扩展。

### 5.3 会话目标

每次实时会话都应关联一个练习目标，例如：

- 发音更自然。
- 句式更完整。
- 商务表达更礼貌。
- 面试回答更有结构。

该目标用于：

- 首页卡片展示。
- practice 页侧栏提示。
- 报告生成时强调重点评分维度。

## 6. 系统架构设计

### 6.1 现有架构承接方式

沿用现有目录职责：

- `apps/web`：实时语音页面、浏览器音频能力、实时消息显示。
- `apps/api`：会话创建、实时参数生成、消息落盘、报告生成。
- `packages/shared-types`：前后端共享会话、消息、报告类型。
- `packages/shared-zod`：请求响应 schema。
- `packages/ui`：practice 页面会话 UI、状态卡、报告摘要 UI。
- `packages/design-tokens`：颜色、间距、卡片、状态样式 token。

### 6.2 外部依赖

- 豆包新版实时语音服务。
- PostgreSQL：最终业务数据。
- Redis：实时状态与报告任务状态。
- PDF 导出方案：
  - 首版建议前端 HTML 导出 PDF 或服务端模板渲染导出二选一。
  - 若追求首版落地速度，优先“前端报告页 + 浏览器导出 PDF”。

### 6.3 总体模块关系

```text
web(home/practice/history/report)
  -> api/realtime
  -> api/conversations
  -> api/history
  -> api/reports
  -> doubao realtime voice

api
  -> postgres
  -> redis
  -> doubao realtime voice auth / session config
  -> report generation provider
```

## 7. 前端设计

### 7.1 页面设计

涉及页面：

- 首页：场景卡片入口。
- `practice`：实时语音主页面。
- `history`：历史记录列表。
- `reports/[id]`：报告详情页。

### 7.2 首页跳转设计

首页点击场景卡片时，跳转到：

```text
/practice?scenarioType=travel-hotel&roleId=guest
```

若用户选择自由聊天：

```text
/practice?mode=free
```

前端进入页面后读取 query，并据此请求后端创建实时会话。

### 7.3 practice 页面模块拆分

建议目录：

```text
apps/web/
  features/
    conversation/
      components/
        ConversationHeader.tsx
        TranscriptPanel.tsx
        ControlBar.tsx
        SessionSidebar.tsx
      hooks/
        useRealtimeConversation.ts
        useTranscriptStream.ts
        useAudioDevices.ts
      stores/
        conversation-store.ts
      lib/
        realtime-client.ts
        transcript-adapter.ts
        audio-playback.ts
        session-params.ts
```

### 7.4 practice 页面核心区域

- 顶部区：场景名、角色名、连接状态、会话时长。
- 中间主区：实时对话文本流。
- 底部控制区：
  - 开始/继续录音
  - 暂停
  - 结束对话
  - 音量调节
  - 重新说/清空当前输入态
- 右侧辅助区：
  - 当前练习目标
  - 场景背景
  - 对话建议
  - 会话结束后报告入口

### 7.5 前端实时状态模型

推荐状态：

- `idle`
- `requesting_session`
- `connecting`
- `ready`
- `recording`
- `assistant_speaking`
- `paused`
- `ending`
- `ended`
- `error`

状态切换必须集中在 `conversation-store` 或 `useRealtimeConversation` 中管理，禁止散落在多个组件局部 state 中。

### 7.6 文本流展示策略

practice 页面需同时支持：

- 用户转写增量文本。
- 用户最终文本。
- AI 增量文本。
- AI 最终文本。

展示策略：

- 增量内容以临时态显示。
- 收到 final 事件后覆盖为最终态。
- 最终态才允许落盘。

### 7.7 音频交互设计

控制条必须支持：

- 麦克风权限请求。
- 启动录音。
- 暂停录音。
- 恢复录音。
- 本地播放音量控制。
- AI 说话时的播放开关。

首版不建议做复杂音频设备切换面板，但应为后续保留 `inputDeviceId`、`outputDeviceId` 扩展口。

## 8. 后端设计

### 8.1 API 模块拆分

在现有 `apps/api/src/modules` 下，实时语音需求主要涉及：

- `realtime`
- `conversation`
- `report`
- `history`
- `scenario`

并建议在 `common/volcengine` 下补充 provider 适配层：

```text
apps/api/src/common/volcengine/
  volcengine.module.ts
  volcengine.config.ts
  doubao-realtime.service.ts
  doubao-prompt.builder.ts
```

### 8.2 realtime 模块职责

`realtime` 模块只负责“实时连接创建前”的业务准备，不负责承接所有消息流。

职责：

- 校验场景参数。
- 读取场景配置和角色配置。
- 创建匿名会话。
- 创建业务 conversation。
- 生成 provider 所需实时会话参数。
- 组织系统提示词。
- 返回前端连接豆包所需配置。

### 8.3 conversation 模块职责

职责：

- 创建业务 conversation。
- 接收最终转写文本。
- 结束会话。
- 持久化 message。
- 更新 conversation 状态。

### 8.4 report 模块职责

职责：

- 根据最终消息生成分析报告。
- 输出结构化报告字段。
- 标记生成状态。
- 提供报告查询接口。

### 8.5 history 模块职责

职责：

- 根据匿名会话标识查询历史记录。
- 返回会话列表。
- 返回会话详情与报告关联信息。

## 9. API 设计

### 9.1 创建实时会话

`POST /api/realtime/session`

请求：

```json
{
  "scenarioType": "travel-hotel",
  "roleId": "guest",
  "mode": "scenario"
}
```

响应建议：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "anonymousSessionId": "anon_xxx",
    "conversationId": "conv_xxx",
    "provider": "doubao",
    "providerSession": {
      "appId": "xxx",
      "token": "xxx",
      "model": "xxx",
      "voiceConfig": {},
      "conversationConfig": {}
    },
    "scenario": {
      "id": "travel-hotel",
      "title": "酒店入住",
      "roleName": "住客"
    }
  }
}
```

### 9.2 结束会话并落盘

`POST /api/conversations/:id/close`

请求：

```json
{
  "transcript": [
    {
      "id": "msg_1",
      "role": "assistant",
      "content": "你好，欢迎入住。",
      "contentType": "final",
      "createdAt": "2026-05-25T10:00:00.000Z"
    }
  ]
}
```

响应：

- 返回 `savedMessages`
- 返回 `reportStatus`
- 若设计为异步生成报告，则返回后续查询 ID

### 9.3 查询报告

`GET /api/reports/:conversationId`

返回：

- 会话概览
- 评分维度
- 总结摘要
- 问题项
- 建议项
- PDF 导出信息

### 9.4 查询历史记录

`GET /api/history`

查询依据：

- visitor token
- anonymous session id
- device token

首版建议以前端本地持久化的匿名 visitor token 作为查询依据。

## 10. 数据模型设计

### 10.1 practice_scenario

字段建议：

- `id`
- `scenario_type`
- `title`
- `subtitle`
- `mode`
- `default_role_id`
- `difficulty`
- `goal`
- `prompt_template_id`
- `is_active`
- `created_at`
- `updated_at`

### 10.2 scenario_role

字段建议：

- `id`
- `scenario_id`
- `role_code`
- `role_name`
- `role_description`
- `is_ai_role`

### 10.3 anonymous_session

字段建议：

- `id`
- `visitor_token_hash`
- `device_fingerprint_hash`
- `created_at`
- `last_seen_at`

### 10.4 conversation

字段建议：

- `id`
- `anonymous_session_id`
- `scenario_id`
- `selected_role_id`
- `mode`
- `provider`
- `provider_session_id`
- `status`
- `started_at`
- `ended_at`
- `duration_seconds`
- `created_at`
- `updated_at`

### 10.5 message

字段建议：

- `id`
- `conversation_id`
- `role`
- `speaker_type`
- `content`
- `content_type`
- `sequence_no`
- `created_at`

说明：

- `role`：`user | assistant | system`
- `content_type`：`partial | final`
- 落库时首版建议只保存 `final`

### 10.6 report

字段建议：

- `id`
- `conversation_id`
- `status`
- `summary`
- `grammar_score`
- `vocabulary_score`
- `fluency_score`
- `pronunciation_score`
- `tone_score`
- `naturalness_score`
- `strengths`
- `issues`
- `suggestions`
- `pdf_url`
- `created_at`
- `updated_at`

### 10.7 redis key 设计

示例：

- `lcai:rt:session:{conversationId}`
- `lcai:rt:status:{conversationId}`
- `lcai:report:job:{conversationId}`
- `lcai:rate-limit:{visitorToken}`

## 11. 报告生成设计

### 11.1 报告输入

输入应至少包含：

- 场景名称
- 角色关系
- 练习目标
- 最终消息列表
- 用户语言背景（首版可选）

### 11.2 报告输出结构

首版建议固定为：

- 总体总结
- 语法问题
- 词汇问题
- 流利度问题
- 发音问题
- 声调问题
- 表达自然度问题
- 三条最重要的改进建议

### 11.3 生成方式

建议使用异步生成：

1. 前端结束会话。
2. API 先保存 conversation 和 message。
3. API 投递报告任务。
4. report 模块生成并更新状态。
5. 前端轮询或进入报告页时查询结果。

### 11.4 PDF 导出策略

首版推荐优先级：

1. 前端报告页直接调用浏览器打印导出 PDF。
2. 若产品要求服务端统一模板，再追加服务端 PDF 渲染。

原因：

- 首版工程复杂度更低。
- 报告页 UI 与导出结果一致。
- 减少引入额外 PDF 渲染服务的成本。

## 12. 豆包实时语音接入设计

### 12.1 接入原则

- 前端直连 provider 实时链路。
- 后端不转发音频流。
- 后端只负责生成连接参数、拼装 prompt、落盘最终文本。

### 12.2 会话参数组装

后端需要根据以下信息拼装 provider session：

- 场景类型
- 角色设定
- 练习目标
- 默认回复语言：中文
- 默认语气：教学友好、自然口语
- 是否允许中英夹杂纠偏

### 12.3 系统提示词设计

系统提示词要显式约束：

- AI 主要使用中文交流。
- 交流难度匹配中文学习者水平。
- AI 在场景内扮演指定角色。
- 对话阶段不做大段讲解，以自然对话为主。
- 会话结束后再由报告模块输出系统性反馈。

### 12.4 失败回退

当实时连接失败时：

- 前端提示“当前实时连接不可用，请重试”。
- API 记录 provider 错误码和 conversationId。
- 保留重新发起连接的能力。

## 13. 状态流转设计

### 13.1 conversation 状态

- `created`
- `connecting`
- `active`
- `paused`
- `ending`
- `ended`
- `report_pending`
- `report_ready`
- `failed`

### 13.2 report 状态

- `pending`
- `processing`
- `ready`
- `failed`

## 14. 安全与隐私

- 不保存原始音频。
- 前端只持有最小必要的实时连接参数。
- 不在日志打印完整 provider token。
- 匿名 visitor token 必须签名或 hash 化。
- 数据库内消息内容和报告内容要受日志脱敏约束。

## 15. 可观测性

### 15.1 必打日志

- 创建 realtime session
- provider 参数生成成功/失败
- conversation 创建
- conversation 结束
- message 保存数量
- report 生成成功/失败

### 15.2 关键指标

- 实时连接成功率
- 平均首包时延
- 平均会话时长
- 会话结束率
- 报告生成成功率
- 报告平均耗时

## 16. 分阶段实施建议

### Phase 1：最小闭环

- 首页场景跳转到 practice
- API 创建 realtime session
- practice 实时文本展示
- 结束会话并落盘最终 transcript

### Phase 2：报告与历史

- 异步报告生成
- 报告页展示
- history 列表查询
- 历史详情查看

### Phase 3：体验增强

- 角色选择器
- 自由聊天模式
- PDF 导出
- 更细粒度评分

## 17. 验收映射

### 17.1 对照需求验收

需求：“点击首页主题对话进入 practice 页面并支持实时对话”

对应设计：

- 首页 query 参数跳转
- `POST /api/realtime/session`
- practice 页实时状态机

需求：“支持暂停、重新语音、调节音量”

对应设计：

- ControlBar
- `paused` 状态
- 本地播放控制

需求：“实时显示 AI 和用户对话内容”

对应设计：

- 增量 transcript 流
- `TranscriptPanel`
- partial/final 消息态

需求：“结束后导出 PDF 报告”

对应设计：

- report 结构化生成
- 报告页导出策略

需求：“history 查看历史对话”

对应设计：

- `anonymous_session + conversation + report`
- `/api/history`

## 18. 结论

本需求最适合在现有架构上增量实现，不需要推翻当前 Monorepo 设计。首版采用“前端直连豆包实时语音 + API 负责业务编排和数据落盘”的模式，可以以较低复杂度完成完整闭环：

- 首页场景进入 practice
- practice 实时中文语音对话
- 会话结束生成分析报告
- 历史记录可查询

首版的关键工程重点不是“做更多能力”，而是把以下闭环做稳：

- 实时连接稳定
- 文本最终态可落盘
- 报告结构可复用
- 历史查询链路完整

如果后续进入实现阶段，建议严格按 `Phase 1 -> Phase 2 -> Phase 3` 推进，不要一开始把角色系统、复杂 PDF 渲染、细粒度评估和多 Provider 抽象一起做完。
