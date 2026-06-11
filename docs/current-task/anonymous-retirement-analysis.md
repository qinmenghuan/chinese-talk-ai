# 匿名机制退役分析文档

## 1. 背景与目标

当前仓库的产品主路径已经切换为纯登录用户模型：

- `practice`
- `history`
- `report`
- `settings`

都要求登录，新的实时会话、手动会话、历史查询、报告查询也都已经按 `userId` 归属。

本分析文档的目标是回答三个问题：

1. 现在移除旧的匿名机制，改动范围有多大。
2. 如何在不影响当前功能，尤其是不影响对话功能的前提下完成移除。
3. 如果要改，推荐按什么顺序做。

结论先说：

- 这不是“小修小补”，但也不是全仓级重构。
- 从代码层面看，属于“中等范围、可分阶段完成”的清理任务。
- 真正的风险不在 Web 登录流程，而在数据库结构、后台查询兼容、以及对历史匿名数据的处理。
- 只要按阶段推进，并且把“对话主链路”作为保护重点，完全可以在不影响现有用户功能的前提下退役匿名机制。

## 2. 当前状态结论

### 2.1 已经完成纯登录主链路的部分

当前主业务链路已经不依赖匿名机制：

- `apps/api/src/modules/realtime/realtime.service.ts`
  - 新建实时会话时只写入 `userId`
  - `anonymousSessionId` 已固定写 `null`
- `apps/api/src/modules/conversation/conversation.controller.ts`
  - 手动创建对话、回复、结束都要求 `UserAccessGuard`
- `apps/api/src/modules/conversation/conversation.service.ts`
  - 会话归属校验走 `userId`
- `apps/api/src/modules/history/history.service.ts`
  - 历史记录只按 `userId` 查询
- `apps/api/src/modules/report/report.service.ts`
  - 用户报告只按 `userId` 查询
- Web 端受限页面已经统一要求登录，不再保留匿名练习主路径

这意味着：

- 用户当前可见功能已经基本是“纯登录用户模型”
- 对话功能当前主路径也已经不依赖匿名身份

### 2.2 还未清掉的匿名残留

匿名机制仍然残留在以下位置。

#### 数据库实体层

- `apps/api/src/common/database/entities.ts`
  - `AnonymousSessionEntity`
  - `conversation.anonymous_session_id`
  - `ConversationEntity.anonymousSession` 关系
  - `idx_conversation_session_started_at` 仍基于 `anonymousSessionId`

#### 后台查询与展示层

- `apps/api/src/modules/conversation/conversation.service.ts`
  - Admin 会话列表仍 `leftJoinAndSelect("conversation.anonymousSession", "anonymousSession")`
  - 仍支持按 `anonymousSession.visitorTokenHash` 搜索
- `apps/api/src/modules/report/report.service.ts`
  - Admin 报告列表仍 join 匿名会话
  - 仍支持按 `anonymousSession.visitorTokenHash` 搜索
- `apps/api/src/modules/conversation/admin-conversation-summary.ts`
  - 仍有 `Anonymous · xxx` 展示逻辑
- `apps/api/src/modules/report/admin-report-summary.ts`
  - 间接复用上述匿名展示逻辑

#### 遗留运行时代码

- `apps/api/src/common/runtime/practice-store.service.ts`
  - 仍保留 `visitorToken` / `anonymousSessionId` 内存模型
  - 但当前仓库中没有其它模块继续引用它
- `apps/api/src/common/runtime/runtime.module.ts`
  - 仍导出该服务

#### Web 端遗留工具

- `apps/web/lib/visitor-token.ts`
  - 仍保留本地 `lcai_visitor_token`
  - 当前主流程中没有发现调用点

## 3. 改动范围评估

### 3.1 总体评估

建议将范围定义为：`中等`

原因：

- 不需要推翻现有登录体系
- 不需要重做对话、历史、报告用户侧主流程
- 需要改数据库实体和表结构
- 需要改后台查询逻辑
- 需要处理历史匿名数据的兼容与迁移

如果拆解到层级：

| 层级           | 范围评估 | 说明                                              |
| -------------- | -------- | ------------------------------------------------- |
| Web 用户端     | 小       | 主流程基本已完成切换，只剩无用工具清理            |
| API 对话主链路 | 小到中   | 主逻辑已是 `userId`，但要避免误伤对话表结构和查询 |
| Admin 后台     | 中       | 仍显式依赖匿名会话 join 和匿名展示                |
| 数据库结构     | 中到大   | 需要删表、删字段、删索引、处理存量数据            |
| 测试与验收     | 中       | 需要补“无匿名结构时对话链路仍正常”的回归验证      |

### 3.2 对当前功能的影响面

#### 对登录注册

影响很小。

原因：

- 当前登录注册流程已经不依赖匿名机制
- `auth/register` / `auth/login` / `auth/session` 与匿名表无直接关系

#### 对对话功能

这是最需要保护的部分，但好消息是：

- 当前对话创建已经只写 `userId`
- 当前实时 ticket、关闭会话、历史详情、报告详情都按 `userId` 工作

所以：

- 只要不直接粗暴删除 `conversation.anonymous_session_id` 并导致 ORM 或查询报错
- 对话功能本身不会因为匿名机制退役而必须重写

#### 对 Admin

影响明显高于用户端。

因为当前后台仍然依赖：

- 匿名展示文案
- 匿名会话 join
- 匿名 token hash 搜索

如果不改 Admin 查询就直接删表，后台列表会直接报错。

## 4. 最大风险点

## 4.1 数据库自动同步风险

当前 `apps/api/src/common/database/database.module.ts` 中：

- `synchronize` 默认开启
- 只有 `DB_SYNCHRONIZE=false` 才关闭

这意味着如果直接删掉实体或字段：

- 本地或部分环境在应用启动时可能自动改表
- 容易出现“代码先改了，数据库被自动删除，旧数据还没迁移完”的问题

这是本次改造里最需要小心的点。

建议：

- 真正进入“删表 / 删字段”阶段前，先关闭自动同步
- 改用显式 migration 管理数据库变更

## 4.2 Admin 查询直接依赖匿名表

当前 Admin 会话列表和报告列表都还会：

- join `conversation.anonymousSession`
- 按 `anonymousSession.visitorTokenHash` 搜索

如果数据库先删匿名表：

- Admin 列表接口会直接失败

## 4.3 历史匿名数据的归属问题

即使主流程已经纯登录，数据库里仍可能存在：

- `conversation.user_id IS NULL`
- `conversation.anonymous_session_id IS NOT NULL`

这类历史记录如果不先处理：

- 直接删表会丢失这类会话的归属线索
- Admin 历史检索能力会变化

## 4.4 对话功能的保护重点不是“逻辑”，而是“表结构”

当前对话功能的业务逻辑已经不依赖匿名身份。

真正风险在于：

- `ConversationEntity` 结构调整
- 相关索引、外键、join 关系变化
- 关闭会话、生成报告、后台检索时的 ORM 行为变化

所以实施时要把关注点放在：

- 结构变更是否会让对话实体读取失败
- admin 查询是否还残留 join
- 测试是否覆盖实时创建、关闭、历史、报告四段

## 5. 是否建议立即一次性删除

不建议一次性删除。

建议采用两阶段到三阶段方案：

1. `代码退耦阶段`
   - 先让代码彻底不再读取匿名结构
   - 但数据库表和字段暂时保留
2. `数据清理阶段`
   - 统计和处理历史匿名数据
3. `结构删除阶段`
   - 删除匿名表、外键、索引、字段

这样做的好处是：

- 用户功能不受影响
- 对话功能风险最低
- 每一步都可以独立验收和回滚

## 6. 推荐实施方案

### 6.1 第一阶段：代码退耦，不删库

目标：

- 不改现有用户功能
- 不动对话主链路行为
- 先把“代码仍依赖匿名结构”的地方全部去掉

建议改动如下。

#### A. 清理后台列表对匿名表的依赖

修改：

- `apps/api/src/modules/conversation/conversation.service.ts`
- `apps/api/src/modules/report/report.service.ts`
- `apps/api/src/modules/conversation/admin-conversation-summary.ts`
- `apps/api/src/modules/report/admin-report-summary.ts`

具体做法：

- 移除 `conversation.anonymousSession` 的 join
- 移除按 `anonymousSession.visitorTokenHash` 搜索条件
- `userDisplay` 只基于 `user.displayName / user.email / user.id`
- 对于历史匿名会话，可暂时统一显示：
  - `Legacy Anonymous`
  - 或 `Unknown User`

注意：

- 这是第一阶段对 Admin 唯一会影响“展示/检索体验”的部分
- 但不会影响用户侧功能

#### B. 删除未使用的运行时匿名服务

删除候选：

- `apps/api/src/common/runtime/practice-store.service.ts`
- `apps/api/src/common/runtime/runtime.module.ts`

前提：

- 先再次确认无引用
- 当前检索结果显示它们已基本孤立

这部分属于低风险清理。

#### C. 删除前端 visitor token 工具

删除候选：

- `apps/web/lib/visitor-token.ts`

前提：

- 当前主流程没有调用点

这部分也是低风险清理。

#### D. 保留数据库结构，但不再被代码读取

第一阶段结束后，允许数据库里还存在：

- `anonymous_session`
- `conversation.anonymous_session_id`

但要求：

- 新代码完全不再依赖它们
- 新功能、新查询、新展示都不再引用它们

### 6.2 第二阶段：数据盘点与迁移

目标：

- 在真正删库前弄清楚历史匿名数据还有多少

建议做的事情：

1. 统计匿名会话数量
2. 统计仍然挂在匿名会话下的 conversation 数量
3. 判断这些 conversation 是否还有业务价值

重点 SQL 维度示意：

- `anonymous_session` 总量
- `conversation where user_id is null`
- `conversation where anonymous_session_id is not null`
- 这些会话是否有 message / report

根据结果分策略：

- 如果都是无价值旧数据：
  - 可直接归档或删除
- 如果仍需保留后台可查：
  - 先导出归档
  - 或写入一份脱敏备份表/文件

建议原则：

- 不把匿名历史硬塞回 `app_user`
- 不做人造“合并为某个系统用户”的伪修复
- 旧匿名数据如果要保留，应作为历史归档而不是继续留在主业务模型里

### 6.3 第三阶段：删除数据库结构

目标：

- 真正完成匿名机制退役

建议变更：

#### A. 关闭自动同步

在执行结构删除前，建议明确设置：

- `DB_SYNCHRONIZE=false`

原因：

- 避免本地/环境在应用启动时自动改表
- 改为显式 migration 更安全

#### B. migration 删除匿名结构

建议通过 migration 执行：

1. 删除 `conversation.anonymous_session_id` 外键
2. 删除相关索引
3. 删除 `conversation.anonymous_session_id` 列
4. 删除 `anonymous_session` 表
5. 更新相关 ORM 实体

#### C. 调整 ConversationEntity

修改：

- `apps/api/src/common/database/entities.ts`

删除：

- `AnonymousSessionEntity`
- `ConversationEntity.anonymousSessionId`
- `ConversationEntity.anonymousSession`
- 基于 `anonymousSessionId` 的索引

完成后，`ConversationEntity` 就会成为标准的纯登录用户会话模型。

## 7. 推荐的改动顺序

推荐按下面顺序做，不建议跳步。

1. 清理 Admin 查询和展示对匿名结构的依赖
2. 删除未使用的 `PracticeStoreService` / `RuntimeModule`
3. 删除 `apps/web/lib/visitor-token.ts`
4. 补全回归测试，确认对话主链路无影响
5. 盘点并处理历史匿名数据
6. 关闭 `DB_SYNCHRONIZE`
7. 编写 migration 删除匿名表和字段
8. 最后再删 ORM 实体定义

这个顺序的核心价值是：

- 先断“代码依赖”
- 再清“数据和结构”

## 8. 对话功能专项保护方案

这是本次改造最重要的验收重点。

### 8.1 需要重点回归的链路

必须覆盖：

1. 用户登录后创建 realtime session
2. 通过 realtime ticket 建立对话连接
3. 结束对话并写入 transcript
4. 生成 report
5. 在 history 中查看会话
6. 打开 report 详情
7. Admin 查看 conversation 列表
8. Admin 查看 report 列表

### 8.2 为什么当前对话功能可安全保留

因为当前代码已经满足：

- 创建会话走 `userId`
- 查询会话走 `userId`
- 关闭会话和报告生成围绕 `conversation.id`
- transcript 缓存在 Redis 中，key 只依赖 `conversationId`

也就是说：

- 只要 `conversation.id` 和 `userId` 主模型不被误伤
- 匿名机制退役不会改变对话功能的业务语义

### 8.3 不建议做的危险操作

不要这样做：

- 在未清理 Admin 查询前直接删 `anonymous_session`
- 在 `DB_SYNCHRONIZE=true` 的情况下直接删除实体字段并重启多环境
- 试图把旧匿名会话自动绑定到某个真实用户
- 把“删匿名表”和“重构对话逻辑”放在一个提交里一起做

## 9. 工作量判断

如果只做到“代码退耦，不删库”：

- 工作量：`中偏小`
- 风险：`低`
- 价值：`高`

如果做到“代码退耦 + 数据清理 + 删库”：

- 工作量：`中偏大`
- 风险：`中`
- 价值：`最高`

更具体地说：

### 9.1 低风险清理

- 删除 `visitor-token.ts`
- 删除 `PracticeStoreService`
- 删除 `RuntimeModule`

### 9.2 中风险改造

- Admin 查询和展示移除匿名依赖
- 对应测试和验收更新

### 9.3 最高风险部分

- 删除数据库字段和表
- 历史匿名数据处理

## 10. 最终建议

建议做，而且建议尽快做，但不要一次性硬删。

推荐策略：

- 先做“第一阶段：代码退耦”
- 确认线上/本地功能稳定，尤其是对话链路稳定
- 再安排“第二、三阶段：数据清理 + 删库”

这样能同时满足三件事：

1. 不影响当前功能
2. 不影响对话功能
3. 为后续彻底删除匿名机制代码和数据库打下干净边界

## 11. 可执行实施清单

如果下一步开始动手，建议直接按下面清单执行：

1. 从 Admin 会话/报告列表中移除匿名 join、匿名搜索、匿名展示。
2. 删除未引用的 `PracticeStoreService` 与 `RuntimeModule`。
3. 删除 `apps/web/lib/visitor-token.ts`。
4. 补充回归测试：
   - realtime session 创建
   - conversation create / reply / close
   - history / report 查询
   - admin conversations / reports 列表
5. 统计匿名历史数据规模。
6. 关闭 `DB_SYNCHRONIZE`。
7. 编写 migration 删除 `anonymous_session` 和 `conversation.anonymous_session_id`。
8. 删除 `AnonymousSessionEntity` 与相关关系字段。
9. 全量验收对话主链路和后台列表。

---

如果要一句话总结：

当前匿名机制已经不是主业务能力，而是“数据库和后台层面的遗留兼容壳”。先解除代码依赖、再清数据、最后删结构，是最稳且不会伤到对话功能的做法。
