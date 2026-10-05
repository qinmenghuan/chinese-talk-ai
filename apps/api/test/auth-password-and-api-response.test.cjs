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
      // 找到用户索引
      const index = state.users.findIndex((user) => user.id === record.id);

      // 新增或更新用户记录。
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
    users: [], // 用户表
    preferences: [], // 用户偏好表
    passwordCredentials: [], // 用户密码凭证表
    sessions: [], // 会话表
    failNextUserSaveWithDuplicateEmail: false, // 测试开关
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

// 创建服务实例
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
