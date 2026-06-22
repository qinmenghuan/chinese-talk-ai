# apps/api

## 作用域

- 这里是 NestJS 11 后端骨架。
- 默认只处理控制器、服务、DTO、模块 wiring 和示例链路。
- 当前阶段不要假设已经有完整生产数据库、Redis 缓存策略或真实豆包实时语音接入。

## 快速入口

- 启动入口：`src/main.ts`
- 根模块：`src/app.module.ts`
- 业务模块：`src/modules/conversation`、`src/modules/realtime`、`src/modules/history`、`src/modules/report`、`src/modules/admin`、`src/modules/scenario`
- 基础设施：`src/common/database`、`src/common/redis`、`src/common/volcengine`、`src/common/runtime`
- 示例测试：`test/realtime-voice.test.cjs`

## 修改边界

- DTO 和 schema 优先与 `packages/shared-types`、`packages/shared-zod` 保持一致。
- 需要新增共享协议时，优先改 `packages/*`，不要只在 `api` 内私有定义。
- 不要为了一个接口改动 `web` 或 `admin`，除非任务明确要求联调。

## 本地验证

- 开发：`pnpm dev:api`
- lint：`pnpm lint:api`
- 类型检查：`pnpm typecheck:api`
- 测试：`pnpm test:api`
- 完整检查：`pnpm check:api`

## 给 Codex 的建议

- 用户如果只改接口，请先定位对应模块目录，再查看 `dto/`、`controller.ts`、`service.ts`。
- 除非缺协议上下文，不要先扫整个 Monorepo，也不要默认阅读 `docs/`。
