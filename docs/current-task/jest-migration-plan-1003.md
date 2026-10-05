# apps/api：将 `auth-password-and-api-response` 迁移至 Jest 的改造方案

## 1. 结论与边界

本次改造应采用**最小接入**：只把 `apps/api/test/auth-password-and-api-response.test.cjs` 从手写 Promise 串行执行器改为 Jest 测试文件，并让 API 的测试命令通过 Jest 运行该文件。被测的 NestJS 代码仍先由现有 `nest build` 编译至 `apps/api/dist`，测试继续加载编译后的 CommonJS 文件。

这样不需要为当前这一份 CJS 测试引入 `ts-jest`、Babel、SWC 或 Nest HTTP 测试服务器，改造风险最低，也不会改变现有业务代码、数据库、Redis 或真实外部服务的行为。

本方案只描述后续实施，不在本次任务中修改代码、依赖或锁文件。

### 明确不在范围内

- 不修改 `apps/web`、`apps/admin`、`packages/design-tokens`、共享类型或共享 schema。
- 不修改 `apps/api/src/**` 的生产代码。
- 不重写其余 `apps/api/test/*.test.cjs` 文件；它们仍保留当前 `node` 执行方式。
- 不把当前单元测试改造成依赖 PostgreSQL、Redis、Google OAuth 或真实 HTTP 服务的集成测试。
- 不改变 API 统一响应 `{ code, message, data }` 的协议。

`packages/design-tokens` 是前端视觉规范，后端 Jest 单元测试没有 UI 输出，因此本次无需引用或修改它；这与“不额外创建后端 UI 规范”的约束一致。

## 2. 当前状态盘点

| 项目          | 当前实现                                                                      | 迁移后的处理                                    |
| ------------- | ----------------------------------------------------------------------------- | ----------------------------------------------- |
| 编译产物      | `apps/api/tsconfig.json` 输出 CommonJS 至 `dist/`                             | 保持不变                                        |
| 测试入口      | `apps/api/package.json` 的 `test` 先执行 build，再逐个 `node test/*.test.cjs` | build 保持；仅目标测试改为 Jest 命令            |
| 目标文件      | Node `assert/strict` + 手写 `Promise.resolve().then(...)` 调度与日志          | Jest 的 `describe` / `it` / `expect` 调度与断言 |
| 依赖替身      | 文件内存储库和 `tokenService` 手工 stub                                       | 保持，必要时以 `jest.fn()` 观察调用             |
| 被测模块      | `dist/modules/auth/auth.service.js`、`dist/common/dto/api-response.dto.js`    | 保持 require 路径，避免引入 TS 运行时转换       |
| 其他 CJS 测试 | 各自直接由 Node 执行                                                          | 原样保留                                        |

当前目标测试覆盖六项行为：API response envelope、密码注册成功、重复邮箱拒绝、数据库唯一约束映射、登录创建 session、错误密码拒绝。迁移后应逐项保留，不能因只换框架而减少断言。

## 3. 推荐技术路线

### 3.1 使用 Jest 原生 CJS 运行能力

目标测试已经是 CJS，且被测对象是 build 后的 CJS `dist` 文件，因此推荐安装 Jest 本体并使用 `jest.config.cjs`。不推荐在本次范围内加入 `ts-jest`：它会让测试绕开当前 `nest build` 产物、引入第二套 TypeScript 编译路径，且没有解决当前测试的必要。

建议以实施时的 npm 最新稳定版 Jest 为准，并将 `jest` 作为 `apps/api` 的 `devDependencies` 安装。安装命令应从仓库根目录执行：

```powershell
pnpm --filter @learn-chinese-ai/api add -D jest
```

这一步必然会更新以下依赖元数据；它们是框架接入所需的最小例外，并非业务代码变动：

- `apps/api/package.json`
- 根目录 `pnpm-lock.yaml`

### 3.2 新增窄范围 Jest 配置

在 `apps/api/jest.config.cjs` 新增配置，并明确限定匹配目标，以防加入 Jest 后误收集其它仍由 Node 运行的 CJS 测试：

```js
/** @type {import('jest').Config} */
module.exports = {
  rootDir: __dirname,
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/auth-password-and-api-response.test.cjs"],
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
};
```

配置无需 `transform`：目标测试和 `dist` 都是 CommonJS。若实施时 Jest 版本要求显式声明 CJS 扩展，则补充其官方推荐的 CJS 配置，而不改变测试文件扩展名或加入 TypeScript transform。

### 3.3 保持当前整体测试顺序

`apps/api/package.json` 的 `test` 仍应先运行 `pnpm run build`，确保 `dist` 与源码同步。随后只替换最后的目标命令：

```text
当前：node test/auth-password-and-api-response.test.cjs
改为：jest --config jest.config.cjs --runInBand
```

`--runInBand` 对这份会 require 同一套 build 输出、使用可变内存 state 的单文件测试没有性能损失，并让本地与 CI 的输出、失败定位保持稳定。其余六个 Node 命令的顺序和文本保持不变，避免扩大本次影响面。

可选地增加一个仅供快速定位的脚本，例如 `test:auth-password`；它应复用同一 Jest 配置，而不能创建第二套命令或配置真值。是否新增该快捷命令可由维护者决定，不是迁移成功的前置条件。

## 4. 目标测试文件的逐步改写

文件路径保持为 `apps/api/test/auth-password-and-api-response.test.cjs`，以满足当前范围限制。

### 4.1 保留 fixture 和服务工厂

以下 helper 保持职责和数据模型不变：

- `createUserRepository(state)`
- `createUserIdentityRepository()`
- `createUserPreferenceRepository(state)`
- `createUserPasswordCredentialRepository(state)`
- `createAdminUserRepository()`
- `createAuthSessionRepository(state)`
- `createService()`

它们模拟的是 TypeORM repository 和 token service 的最小接口；不应为了 Jest 改成真实数据库，也不应把它们抽到共享包。每个 `it` 内调用 `createService()`，继续获得新的 `state`，从根源上避免测试之间共享用户、session 或“下一次保存失败”标记。

保留文件顶部的 `require('reflect-metadata')`，因为载入编译后的 NestJS 类时仍可能需要其元数据环境。

### 4.2 用 Jest 套件结构替换手写运行器

移除：

- `const assert = require('node:assert/strict')`
- 六个 `testXxx` 包装函数（可将函数体直接移至测试）
- 底部 `Promise.resolve().then(...).catch(...)` 链
- 所有 `console.log('PASS ...')`、`console.error(...)`、`process.exit(1)`

改为一个描述清晰的 suite，并使用行为化名称：

```js
describe("password authentication and API response", () => {
  it("wraps data in the project API response envelope", () => {});
  it("creates a password credential and preference when registering", async () => {});
  // 其余四项行为逐项迁移
});
```

Jest 会负责异步失败传播、测试统计、成功/失败输出和非零退出码；测试内不应再自行管理进程退出。

### 4.3 可直接替换的完整 Jest 测试代码

以下代码应完整替换 `apps/api/test/auth-password-and-api-response.test.cjs` 的当前内容。它保留了全部内存 repository、token service stub 和六项现有覆盖，仅把 Node Assert 与手写运行器替换为 Jest。执行前仍须先运行 API build，使 `../dist/**` 存在且是最新产物。

```js
const { describe, expect, it } = require("@jest/globals");

// reflect-metadata 是 TypeORM / NestJS 常见依赖，确保在运行时装饰器元数据可用。
// 这类测试文件模拟了仓储层与认证服务之间的交互，因此需要提前加载元数据支持。
require("reflect-metadata");

/**
 * 用户仓储的内存实现，用于替代真实数据库。
 *
 * 这里的重点不是数据库本身，而是验证认证服务在以下情况下的行为：
 * 1. 根据 id / email 查询用户
 * 2. 新增或更新用户记录
 * 3. 处理重复邮箱导致的数据库唯一约束异常
 *
 * state 是一个简化的内存状态对象，保存所有测试中需要共享的数据。
 */
function createUserRepository(state) {
  return {
    async findOne({ where }) {
      // 根据用户 id 查询：例如登录时、刷新 token 时可能用到 userId。
      if (where.id) {
        return state.users.find((user) => user.id === where.id) ?? null;
      }

      // 根据邮箱查询：这是注册和登录的核心检查点之一。
      if (where.email) {
        return state.users.find((user) => user.email === where.email) ?? null;
      }

      return null;
    },
    async save(next) {
      // 模拟数据库层针对唯一索引的边界情况。
      // 当测试需要验证“邮箱重复”时，先设置 failNextUserSaveWithDuplicateEmail = true。
      if (state.failNextUserSaveWithDuplicateEmail) {
        state.failNextUserSaveWithDuplicateEmail = false;
        throw new Error(
          'duplicate key value violates unique constraint "idx_app_user_email_unique"'
        );
      }

      const record = { ...next };
      const index = state.users.findIndex((user) => user.id === record.id);

      if (index === -1) {
        state.users.push(record);
      } else {
        state.users[index] = record;
      }

      return record;
    },
  };
}

/**
 * 第三方登录身份信息仓储。
 * 本测试关注密码认证与用户注册流程，因此这里直接返回空值即可。
 */
function createUserIdentityRepository() {
  return {
    async findOne() {
      return null;
    },
    async save(next) {
      return { ...next };
    },
  };
}

/**
 * 用户偏好信息仓储。
 * 在注册时通常会同步创建一条 user_preferences 记录，
 * 用于保存语言偏好、学习设置等基础配置。
 */
function createUserPreferenceRepository(state) {
  return {
    async findOne({ where }) {
      return (
        state.preferences.find((preference) => preference.userId === where.userId) ?? null
      );
    },
    async save(next) {
      const record = { ...next };
      const index = state.preferences.findIndex(
        (preference) => preference.userId === record.userId
      );

      if (index === -1) {
        state.preferences.push(record);
      } else {
        state.preferences[index] = record;
      }

      return record;
    },
  };
}

/**
 * 密码凭证仓储。
 * 它持有加密后的 passwordHash，用于登录时验证密码是否正确，
 * 也是密码认证最关键的持久化对象之一。
 */
function createUserPasswordCredentialRepository(state) {
  return {
    async findOne({ where }) {
      return (
        state.passwordCredentials.find(
          (credential) => credential.userId === where.userId
        ) ?? null
      );
    },
    async save(next) {
      const record = { ...next };
      const index = state.passwordCredentials.findIndex(
        (credential) => credential.userId === record.userId
      );

      if (index === -1) {
        state.passwordCredentials.push(record);
      } else {
        state.passwordCredentials[index] = record;
      }

      return record;
    },
  };
}

/**
 * 管理员用户仓储。
 * 当前用例并不真正走管理员登录分支，所以本实现保持空对象即可。
 */
function createAdminUserRepository() {
  return {
    async findOne() {
      return null;
    },
    async save(next) {
      return { ...next };
    },
  };
}

/**
 * 会话仓储，保存 refresh token 和用户会话状态。
 * 它通常被用于“登录成功后写入会话记录”，以及“刷新 token 校验”场景。
 */
function createAuthSessionRepository(state) {
  return {
    async save(next) {
      const record = { ...next };
      const index = state.sessions.findIndex((session) => session.id === record.id);

      if (index === -1) {
        state.sessions.push(record);
      } else {
        state.sessions[index] = record;
      }

      return record;
    },
    async findOne({ where }) {
      return (
        state.sessions.find(
          (session) =>
            session.refreshTokenHash === where.refreshTokenHash &&
            session.actorType === where.actorType
        ) ?? null
      );
    },
  };
}

/**
 * 创建认证服务和内存状态的工厂函数。
 *
 * 这样做的好处是：每个用例都可以拥有独立的状态，避免相互污染；
 * 同时也复现了真实服务依赖的仓储与 token 生成逻辑。
 */
function createService() {
  // 这里直接要求编译产物中的 AuthService，因为这是现有测试习惯：
  // 先构建后运行 Jest，确保测试真实走到了输出代码，而不是仅仅验证 mock。
  const { AuthService } = require("../dist/modules/auth/auth.service.js");

  // 在内存中模拟数据库表：users / preferences / passwordCredentials / sessions。
  // failNextUserSaveWithDuplicateEmail 是一个测试开关，专门模拟唯一约束冲突。
  const state = {
    users: [],
    preferences: [],
    passwordCredentials: [],
    sessions: [],
    failNextUserSaveWithDuplicateEmail: false,
  };

  // 令牌服务的模拟实现，主要为了让测试按固定值断言输出信号，
  // 如 refresh token、access token 和 token 有效期等。
  const tokenService = {
    createOpaqueToken() {
      return "refresh-token";
    },
    hashOpaqueToken() {
      return "refresh-token-hash";
    },
    getRefreshTokenTtlSeconds() {
      return 3600;
    },
    signAccessToken(payload) {
      return {
        token: `access-token-for-${payload.sub}`,
        expiresInSeconds: 900,
      };
    },
  };

  const service = new AuthService(
    createUserRepository(state),
    createUserIdentityRepository(),
    createUserPreferenceRepository(state),
    createUserPasswordCredentialRepository(state),
    createAdminUserRepository(),
    createAuthSessionRepository(state),
    tokenService
  );

  return { service, state };
}

describe("password authentication and API response", () => {
  /**
   * 用例 1：校验统一 API 响应结构。
   *
   * 项目中通常会把数据封装成统一的 { code, message, data } 结构，
   * 这样前端无需关心每个接口的返回细节，只需要统一解析 envelope。
   */
  it("wraps data in the project API response envelope", () => {
    const { createApiResponse } = require("../dist/common/dto/api-response.dto.js");

    expect(createApiResponse({ success: true })).toEqual({
      code: 200,
      message: "",
      data: { success: true },
    });
  });

  /**
   * 用例 2：验证注册成功时会创建用户、首选项和 password credential。
   *
   * 这条用例是密码认证的正向基线：既确认注册成功，也确认系统会在数据库模拟状态中
   * 产生相应数据，并且 passwordHash 具有 scrypt 这种标准哈希前缀。
   */
  it("creates a password credential and preference when registering", async () => {
    const { service, state } = createService();

    const result = await service.registerUser({
      email: "learner@example.com",
      password: "example123",
      confirmPassword: "example123",
    });

    expect(result).toEqual({ success: true });
    expect(state.users).toHaveLength(1);
    expect(state.users[0].email).toBe("learner@example.com");
    expect(state.preferences).toHaveLength(1);
    expect(state.passwordCredentials).toHaveLength(1);
    expect(state.passwordCredentials[0].passwordHash).toMatch(/^scrypt\$/);
  });

  /**
   * 用例 3：验证重复邮箱不能重复注册。
   *
   * 这是最基础的业务规则：邮箱是系统中的唯一识别字段之一，
   * 重复注册应被拒绝并返回面向用户的业务错误信息。
   */
  it("rejects registration with an email that is already registered", async () => {
    const { service } = createService();

    await service.registerUser({
      email: "learner@example.com",
      password: "example123",
      confirmPassword: "example123",
    });

    await expect(
      service.registerUser({
        email: "learner@example.com",
        password: "example123",
        confirmPassword: "example123",
      })
    ).rejects.toThrow("This email is already registered.");
  });

  /**
   * 用例 4：验证底层数据库唯一约束异常被映射成业务错误。
   *
   * 真实数据库在并发或脏数据条件下可能抛出 "duplicate key ..." 这样的异常，
   * 业务层需要把它转换成更友好的域错误，而不是直接把底层 SQL 细节暴露给调用者。
   */
  it("maps a duplicate-email database constraint to the domain conflict", async () => {
    const { service, state } = createService();
    state.failNextUserSaveWithDuplicateEmail = true;

    await expect(
      service.registerUser({
        email: "learner@example.com",
        password: "example123",
        confirmPassword: "example123",
      })
    ).rejects.toThrow("This email is already registered.");
  });

  /**
   * 用例 5：验证正确密码能够登录并创建会话。
   *
   * 登录成功通常需要完成三个动作：
   * - 校验用户密码是否正确
   * - 生成 access token 与 refresh token
   * - 写入 session 表，记录 userAgent / IP 等上下文信息
   */
  it("creates a session when logging in with the correct password", async () => {
    const { service, state } = createService();

    await service.registerUser({
      email: "learner@example.com",
      password: "example123",
      confirmPassword: "example123",
    });

    const result = await service.loginUser(
      {
        email: "learner@example.com",
        password: "example123",
      },
      {
        userAgent: "test-suite",
        ipAddress: "127.0.0.1",
      }
    );

    expect(result.user.email).toBe("learner@example.com");
    expect(result.accessToken).toBe(`access-token-for-${result.user.id}`);
    expect(result.setCookie).toMatch(/lcai_user_refresh_token=refresh-token/);
    expect(state.sessions).toHaveLength(1);
    expect(state.users[0].lastLoginAt).toBeInstanceOf(Date);
  });

  /**
   * 用例 6：验证错误密码会被拒绝。
   *
   * 这是登录的安全性校验：即便账号存在，密码错误也不能进入应用，
   * 避免暴露用户细节、降低账户被枚举或枚举攻击的风险。
   */
  it("rejects login with an incorrect password", async () => {
    const { service } = createService();

    await service.registerUser({
      email: "learner@example.com",
      password: "example123",
      confirmPassword: "example123",
    });

    await expect(
      service.loginUser(
        {
          email: "learner@example.com",
          password: "wrongpass123",
        },
        {}
      )
    ).rejects.toThrow("Email or password is incorrect.");
  });
});
```

这份代码使用 `@jest/globals` 显式引入测试 API，避免依赖 Jest 的隐式全局变量；因此在 CJS、ESLint 和编辑器环境中的可读性更稳定。无需使用 `jest.fn()`，因为现有六项测试验证的是 `AuthService` 的可观察业务结果，而不是其内部调用次数。

### 4.4 断言映射表

| 当前 Node Assert                     | 推荐 Jest 写法                                   | 保留的验证意图                      |
| ------------------------------------ | ------------------------------------------------ | ----------------------------------- |
| `assert.deepEqual(actual, expected)` | `expect(actual).toEqual(expected)`               | 完整响应 envelope、注册返回值       |
| `assert.equal(actual, expected)`     | `expect(actual).toBe(expected)`                  | 数量、邮箱、token、cookie、错误信息 |
| `assert.match(value, regex)`         | `expect(value).toMatch(regex)`                   | scrypt hash、cookie                 |
| `assert.ok(value)`                   | `expect(value).toBeTruthy()` 或具体 matcher      | `lastLoginAt` 存在                  |
| `value instanceof Date`              | `expect(value).toBeInstanceOf(Date)`             | 登录时间为 Date                     |
| `assert.rejects(promise, callback)`  | `await expect(promise).rejects.toThrow(message)` | 业务异常消息                        |

对目前 `assert.rejects` 的三个分支，优先使用 `await expect(service.method(...)).rejects.toThrow('...')`。如果未来需要断言异常的 status 或自定义字段，再采用 `try/catch` 后对异常对象作精确 `expect` 断言；不要因迁移框架而放宽错误断言。

### 4.5 六条必须保留的测试用例

1. `createApiResponse({ success: true })` 仍精确等于 `{ code: 200, message: '', data: { success: true } }`。
2. 密码注册后，返回 `{ success: true }`，并各创建一条 user、preference、password credential；credential hash 以 `scrypt$` 开头。
3. 同一邮箱第二次注册被拒绝，消息为 `This email is already registered.`。
4. repository 抛出 email unique constraint 文本时，服务仍映射为相同的业务冲突消息。
5. 正确密码登录后，验证返回用户邮箱、access token、refresh cookie、一条 session，以及用户 `lastLoginAt` 为 `Date`。
6. 错误密码登录被拒绝，消息为 `Email or password is incorrect.`。

### 4.6 Mock 的使用原则

当前内存 repository 足以表达本测试的业务状态，应优先保留。只有要验证协作行为（例如 `tokenService.signAccessToken` 的参数）时，才把某个 stub 方法包裹为 `jest.fn()`；不要为所有 stub 机械添加 mock，以免测试与实现细节过度耦合。

不要 mock `AuthService` 本身，也不要 mock `createApiResponse`。这两者正是本文件的被测目标。

## 5. 实施文件清单

| 文件                                                    | 操作     | 原因                                                                   |
| ------------------------------------------------------- | -------- | ---------------------------------------------------------------------- |
| `apps/api/test/auth-password-and-api-response.test.cjs` | 修改     | 将手写执行/断言转换为 Jest suite/matchers，保留 fixture 与六项业务覆盖 |
| `apps/api/jest.config.cjs`                              | 新增     | 限定 Jest 只收集本目标文件并固定 Node 环境                             |
| `apps/api/package.json`                                 | 修改     | 新增 Jest devDependency，并将目标测试的执行命令换为 Jest               |
| `pnpm-lock.yaml`                                        | 自动更新 | 锁定新增测试依赖的完整解析结果                                         |

除以上四个文件外，本任务不应产生代码改动。若“其他文件不动”被解释为连 `package.json`、锁文件和配置也绝对不可更改，则无法真正接入 Jest；那种情况下只能交付测试文件草案，不能让仓库运行 Jest。建议采用上表的最小必要例外。

## 6. 验证与验收

实施完成后在仓库根目录依次执行：

```powershell
pnpm --filter @learn-chinese-ai/api run build
pnpm --filter @learn-chinese-ai/api exec jest --config jest.config.cjs --runInBand
pnpm test:api
pnpm lint:api
pnpm typecheck:api
pnpm format
```

验收标准：

- Jest 只发现并执行 `auth-password-and-api-response.test.cjs`，显示 1 个 suite、6 个 passed tests。
- 目标测试失败时，Jest 能显示具体 `it` 名称、断言差异与堆栈；不再依赖手写 `PASS`/`FAIL` 日志。
- `pnpm test:api` 仍先 build，且未迁移的 CJS 测试仍由 Node 成功执行。
- `lint`、`typecheck`、Prettier 检查通过；本目标为 CJS 测试，API TypeScript 生产编译行为不变。
- Git diff 仅包含第 5 节列出的四个文件；没有 API 业务逻辑、前端、管理台、token 或共享协议改动。

## 7. 风险与回滚

| 风险                          | 预防措施                                            | 回滚方式                                  |
| ----------------------------- | --------------------------------------------------- | ----------------------------------------- |
| Jest 误收集其他 Node CJS 测试 | 显式 `testMatch` 只指向目标文件                     | 删除 Jest 配置/依赖并恢复单条 `node` 命令 |
| 测试读取过时 `dist`           | `test` 保留 build 前置；本地单跑前先 build          | 重新 build 后执行原 Node 测试             |
| 测试间 state 泄漏             | 每个 `it` 内重新 `createService()`                  | 保持原 fixture 生命周期即可               |
| Jest 版本与 CJS 配置差异      | 采用安装版本的官方 CJS 配置说明，并在 Node 环境验证 | 固定已验证版本，或继续沿用 Node 执行器    |
| 范围膨胀到其他测试            | 不修改其余 `.test.cjs`，不调整共享测试工具          | 本次 PR 只保留目标测试相关 diff           |

回滚是低风险且可逆的：移除 Jest 依赖与 `jest.config.cjs`，恢复 `package.json` 中目标测试原有的 `node test/auth-password-and-api-response.test.cjs` 调用，并还原该文件的 Node Assert 版本即可；无需数据迁移或生产环境操作。

## 8. 建议的后续节奏

本次先完成单文件迁移并在 CI 中稳定运行一段时间。确认 Jest 的安装、输出与缓存策略符合预期后，再单独立项迁移其余 API 测试。后续任务应为每个测试明确边界，避免在这次仅针对密码认证与响应协议的改造中重写全套测试基础设施。
