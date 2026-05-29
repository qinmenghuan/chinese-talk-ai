# Database Design

## 1. Scope

本文档基于当前后端代码中的 TypeORM 实体整理，主要对应以下文件：

- `apps/api/src/common/database/entities.ts`
- `apps/api/src/common/database/database.module.ts`
- `apps/api/src/modules/scenario/scenario.seed.service.ts`

当前数据库使用 `PostgreSQL`，ORM 为 `TypeORM`。  
运行时还有一部分实时字幕和幂等锁数据放在 `Redis`，这部分不是关系型表结构，但会在文末一并说明。

## 2. Database Role

当前数据库主要承担三类数据：

- 基础配置数据：练习场景、场景角色
- 运行过程主数据：匿名访客、会话、消息
- 结果数据：练习报告

## 3. Table Overview

当前 PostgreSQL 中的核心表共有 6 张：

1. `practice_scenario`
2. `scenario_role`
3. `anonymous_session`
4. `conversation`
5. `message`
6. `report`

## 4. ER Relationship

```text
practice_scenario 1 ─── N scenario_role
practice_scenario 1 ─── N conversation
scenario_role     1 ─── N conversation
anonymous_session 1 ─── N conversation
conversation      1 ─── N message
conversation      1 ─── 1 report
```

也可以从业务流程理解：

1. 系统预置一个练习场景 `practice_scenario`
2. 每个场景下定义多个角色 `scenario_role`
3. 用户进入练习时，会先归属于一个匿名访客 `anonymous_session`
4. 每次练习会创建一条会话 `conversation`
5. 会话结束后，最终对话消息落入 `message`
6. 如果生成报告，则会为该会话生成一条 `report`

## 5. Table Details

### 5.1 `practice_scenario`

用途：存储练习场景主数据，是系统中的场景字典表。

| 字段              | 类型           | 约束        | 含义                                                |
| ----------------- | -------------- | ----------- | --------------------------------------------------- |
| `id`              | `varchar(64)`  | PK          | 场景唯一 ID，如 `daily-cafe`                        |
| `type`            | `varchar(32)`  |             | 场景类别，如日常、面试、旅行、商务                  |
| `title`           | `varchar(120)` |             | 场景标题，用于前端展示                              |
| `subtitle`        | `text`         |             | 场景副标题或简要描述                                |
| `mode`            | `varchar(32)`  |             | 练习模式，如 `scenario`、`free`                     |
| `difficulty`      | `varchar(32)`  |             | 难度等级，如 `beginner`、`intermediate`、`advanced` |
| `goal`            | `text`         |             | 本场景训练目标                                      |
| `cover_url`       | `text`         |             | 场景封面图地址                                      |
| `default_role_id` | `varchar(64)`  |             | 默认角色 ID，指向业务含义上的默认角色               |
| `opening_line`    | `text`         |             | AI 开场白                                           |
| `prompt_hint`     | `text`         |             | 页面或提示词层面的训练引导文案                      |
| `is_active`       | `boolean`      | 默认 `true` | 场景是否启用                                        |
| `created_at`      | `timestamptz`  |             | 创建时间                                            |
| `updated_at`      | `timestamptz`  |             | 更新时间                                            |

关系：

- 一条 `practice_scenario` 对应多条 `scenario_role`
- 一条 `practice_scenario` 对应多条 `conversation`

说明：

- 该表是基础配置表，通常由种子数据初始化
- `default_role_id` 当前是普通字段，不是数据库层外键约束

### 5.2 `scenario_role`

用途：存储某个练习场景下可选角色。

| 字段          | 类型           | 约束         | 含义                                     |
| ------------- | -------------- | ------------ | ---------------------------------------- |
| `id`          | `varchar(64)`  | PK           | 角色唯一 ID                              |
| `scenario_id` | `varchar(64)`  | FK           | 所属场景 ID，关联 `practice_scenario.id` |
| `code`        | `varchar(32)`  |              | 角色编码，便于程序判断                   |
| `name`        | `varchar(120)` |              | 角色名称，如“咖啡店员”“顾客”             |
| `description` | `text`         |              | 角色说明                                 |
| `is_ai_role`  | `boolean`      | 默认 `false` | 该角色是否由 AI 扮演                     |
| `sort_order`  | `int`          | 默认 `0`     | 角色排序                                 |
| `created_at`  | `timestamptz`  |              | 创建时间                                 |
| `updated_at`  | `timestamptz`  |              | 更新时间                                 |

关系：

- 多条 `scenario_role` 属于一条 `practice_scenario`
- 一条 `scenario_role` 可被多条 `conversation` 作为 `selected_role_id` 选择

删除规则：

- 当场景被删除时，角色会跟随删除，`onDelete: CASCADE`

### 5.3 `anonymous_session`

用途：存储匿名访客标识，用于在不登录的情况下串联同一个用户的练习历史。

| 字段                      | 类型           | 约束       | 含义                                      |
| ------------------------- | -------------- | ---------- | ----------------------------------------- |
| `id`                      | `varchar(64)`  | PK         | 匿名会话主键，如 `anon_xxx`               |
| `visitor_token_hash`      | `varchar(128)` | 唯一索引   | 访客 token 的哈希值，用于识别同一匿名用户 |
| `device_fingerprint_hash` | `varchar(128)` | 可空       | 设备指纹哈希，当前未强依赖                |
| `source`                  | `varchar(64)`  | 默认 `web` | 来源渠道，如 `web`                        |
| `created_at`              | `timestamptz`  |            | 首次创建时间                              |
| `last_seen_at`            | `timestamptz`  |            | 最近活跃时间                              |

关系：

- 一条 `anonymous_session` 对应多条 `conversation`

索引：

- `idx_anonymous_session_visitor_token_hash`

说明：

- 当前系统没有完整账号体系，因此这张表承担“匿名用户识别”的职责
- 业务上通过 `visitorToken -> sha256 -> visitor_token_hash` 的方式关联历史记录

### 5.4 `conversation`

用途：存储一次完整练习会话的主记录，是历史记录、消息、报告的核心主表。

| 字段                   | 类型           | 约束                     | 含义                                                     |
| ---------------------- | -------------- | ------------------------ | -------------------------------------------------------- |
| `id`                   | `varchar(64)`  | PK                       | 会话唯一 ID，如 `conv_xxx`                               |
| `anonymous_session_id` | `varchar(64)`  | FK                       | 所属匿名访客，关联 `anonymous_session.id`                |
| `scenario_id`          | `varchar(64)`  | FK                       | 练习场景 ID，关联 `practice_scenario.id`                 |
| `selected_role_id`     | `varchar(64)`  | FK                       | 本次选择的角色 ID，关联 `scenario_role.id`               |
| `mode`                 | `varchar(32)`  |                          | 本次会话模式                                             |
| `provider`             | `varchar(32)`  | 默认 `volcengine-rtc-ai` | 底层语音/对话提供方标识                                  |
| `provider_room_id`     | `varchar(128)` | 可空                     | 提供方房间 ID，适用于 RTC 类方案                         |
| `provider_session_id`  | `varchar(128)` | 可空                     | 提供方会话 ID                                            |
| `status`               | `varchar(32)`  |                          | 会话状态，如 `active`、`paused`、`ended`、`report_ready` |
| `started_at`           | `timestamptz`  |                          | 会话开始时间                                             |
| `ended_at`             | `timestamptz`  | 可空                     | 会话结束时间                                             |
| `duration_seconds`     | `int`          | 默认 `0`                 | 会话总时长，单位秒                                       |
| `created_at`           | `timestamptz`  |                          | 创建时间                                                 |
| `updated_at`           | `timestamptz`  |                          | 更新时间                                                 |

关系：

- 多条 `conversation` 属于一条 `anonymous_session`
- 多条 `conversation` 属于一条 `practice_scenario`
- 多条 `conversation` 可选择同一个 `scenario_role`
- 一条 `conversation` 对应多条 `message`
- 一条 `conversation` 最多对应一条 `report`

索引：

- `idx_conversation_session_started_at`：按匿名访客 + 开始时间查询历史
- `idx_conversation_status`：按状态查询会话

说明：

- 当前进入 `practice` 页面时会先创建 `conversation`
- 但只有真正发生过用户最终发言，并在离开页面或点击结束后执行 close，才会成为有效历史记录
- `ended_at` 是否有值，是当前区分“已落历史会话”和“未完成空会话”的重要标志之一

### 5.5 `message`

用途：存储会话结束后最终持久化的对话消息明细。

| 字段                | 类型           | 约束     | 含义                                          |
| ------------------- | -------------- | -------- | --------------------------------------------- |
| `id`                | `varchar(64)`  | PK       | 消息唯一 ID，如 `msg_xxx`                     |
| `conversation_id`   | `varchar(64)`  | FK       | 所属会话 ID，关联 `conversation.id`           |
| `sequence_no`       | `int`          | 联合唯一 | 会话内顺序号，从 1 开始递增                   |
| `role`              | `varchar(16)`  |          | 对话角色，如 `user`、`assistant`、`system`    |
| `speaker_type`      | `varchar(24)`  |          | 说话者类型，如 `human`、`assistant`、`system` |
| `content`           | `text`         |          | 消息文本内容                                  |
| `content_type`      | `varchar(16)`  |          | 内容类型，如 `partial`、`final`               |
| `provider_event_id` | `varchar(128)` | 可空     | 第三方事件 ID，当前大多为空                   |
| `created_at`        | `timestamptz`  |          | 消息创建时间                                  |

关系：

- 多条 `message` 属于一条 `conversation`

索引：

- `idx_message_conversation_sequence`
  - 联合字段：`conversation_id + sequence_no`
  - 保证单会话内消息顺序唯一

删除规则：

- 删除会话时，消息会级联删除，`onDelete: CASCADE`

说明：

- 实时对话过程中，字幕先缓存在 Redis
- 会话 close 时，最终 transcript 会整体写入 `message`
- 因此这张表存的是“最终落盘结果”，不是每个实时事件的原始流

### 5.6 `report`

用途：存储某次练习会话生成的分析报告。

| 字段                  | 类型           | 约束       | 含义                                                    |
| --------------------- | -------------- | ---------- | ------------------------------------------------------- |
| `id`                  | `varchar(64)`  | PK         | 报告主键，如 `rep_xxx`                                  |
| `conversation_id`     | `varchar(64)`  | 唯一 FK    | 所属会话 ID，关联 `conversation.id`                     |
| `status`              | `varchar(16)`  |            | 报告状态，如 `pending`、`processing`、`ready`、`failed` |
| `title`               | `varchar(160)` |            | 报告标题                                                |
| `summary`             | `text`         |            | 报告摘要                                                |
| `grammar_score`       | `int`          | 默认 `0`   | 语法评分                                                |
| `vocabulary_score`    | `int`          | 默认 `0`   | 词汇评分                                                |
| `fluency_score`       | `int`          | 默认 `0`   | 流利度评分                                              |
| `pronunciation_score` | `int`          | 默认 `0`   | 发音评分                                                |
| `tone_score`          | `int`          | 默认 `0`   | 声调评分                                                |
| `naturalness_score`   | `int`          | 默认 `0`   | 自然度评分                                              |
| `strengths_json`      | `jsonb`        | 默认空数组 | 优势列表                                                |
| `issues_json`         | `jsonb`        | 默认空数组 | 问题列表                                                |
| `suggestions_json`    | `jsonb`        | 默认空数组 | 建议列表                                                |
| `pdf_url`             | `text`         | 可空       | 报告 PDF 地址或文件名                                   |
| `generated_at`        | `timestamptz`  |            | 报告生成时间                                            |
| `created_at`          | `timestamptz`  |            | 创建时间                                                |
| `updated_at`          | `timestamptz`  |            | 更新时间                                                |

关系：

- 一条 `report` 对应一条 `conversation`
- 一条 `conversation` 最多只能有一条 `report`

索引：

- `idx_report_conversation_unique`

删除规则：

- 删除会话时，报告会级联删除，`onDelete: CASCADE`

说明：

- 报告表是典型的结果表，依赖 `message` 中的最终对话文本进行生成
- 当前报告是规则生成，不依赖外部大模型评分服务

## 6. Status and Lifecycle

### 6.1 `conversation.status`

当前代码中支持的状态包括：

- `created`
- `connecting`
- `active`
- `paused`
- `ending`
- `ended`
- `report_pending`
- `report_ready`
- `failed`

当前实际常见流转大致是：

1. 创建 realtime session 后，`conversation` 初始为 `active`
2. 用户完成真实对话并结束时：
   - 如果要生成报告：`active -> report_pending -> report_ready`
   - 如果只记录历史不立即生成报告：`active -> ended`
3. 如果用户只进入页面但没有发生有效用户发言：
   - `conversation` 可能已经被创建
   - 但不会被 close，因此不应进入 history

### 6.2 `report.status`

当前代码中定义的状态包括：

- `pending`
- `processing`
- `ready`
- `failed`

当前实现里最常见的是 `ready`。

## 7. Business Relationship by Phase

### 7.1 场景配置阶段

- `practice_scenario`：定义练习主题
- `scenario_role`：定义每个主题中的角色组合

### 7.2 用户进入练习阶段

- `anonymous_session`：识别匿名访客
- `conversation`：创建一次新的练习会话

### 7.3 会话进行阶段

- 实时字幕先进入 Redis 缓存
- PostgreSQL 中的 `conversation` 持续存在，但 `message` 可能还未落盘

### 7.4 会话完成阶段

- `message`：持久化最终 transcript
- `report`：生成会话报告
- `conversation`：更新结束时间、状态、时长

## 8. Redis Runtime Data

当前系统除了 PostgreSQL 表，还使用 Redis 保存实时过程数据：

### 8.1 实时字幕缓存

- Key：`lcai:rt:subtitle:{conversationId}`
- 作用：缓存实时对话过程中的 transcript
- 写入时机：创建 realtime session、实时字幕更新
- 删除时机：会话 close 并落库后删除

### 8.2 结束幂等锁

- Key：`lcai:idempotency:close:{conversationId}`
- 作用：防止同一会话被重复 close
- 删除策略：设置过期时间，由 Redis 自动清理

说明：

- Redis 中的数据属于运行态缓存，不是最终事实表
- 最终历史记录与报告仍以 PostgreSQL 为准

## 9. Current Design Characteristics

当前数据库设计有以下特点：

- 配置表和运行表边界清晰
- 匿名访客与正式账号体系解耦，便于快速验证产品流程
- 会话主表 `conversation` 负责串联场景、角色、消息、报告
- 实时流过程数据先放 Redis，结束时再批量落 PostgreSQL
- 历史记录是“会话完成后的结果视图”，不是“所有创建过的会话”

## 10. Current Limitations

基于当前代码，数据库层还有一些可继续演进的地方：

- `practice_scenario.default_role_id` 还不是数据库级外键
- 缺少针对 `provider_session_id`、`scenario_id` 等字段的更多查询索引
- `message` 目前只保存最终 transcript，没有保存原始实时事件流
- 还没有正式用户表、课程表、支付表、权限表等完整业务模型
- 历史记录依赖匿名 token，后续若接入登录体系，需要补用户维度关联

## 11. Recommended Follow-up

后续如果进入生产化阶段，建议优先补强以下内容：

1. 增加数据库迁移脚本，逐步替代 `synchronize`
2. 为 `default_role_id` 增加更严格的约束方案
3. 为高频查询补充复合索引
4. 增加审计字段和软删除策略
5. 评估是否需要单独的“实时事件表”保存原始语音事件和中间转写
