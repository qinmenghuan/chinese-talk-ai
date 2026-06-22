const assert = require("node:assert/strict");
require("reflect-metadata");

const originalEnv = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  NODE_USE_ENV_PROXY: process.env.NODE_USE_ENV_PROXY,
};

function createUserRepository(state) {
  return {
    async findOne({ where }) {
      if (where.id) {
        return state.users.find((user) => user.id === where.id) ?? null;
      }

      if (where.email) {
        return state.users.find((user) => user.email === where.email) ?? null;
      }

      return null;
    },
    async save(next) {
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

function createUserIdentityRepository(state) {
  return {
    async findOne({ where }) {
      const record =
        state.identities.find(
          (identity) =>
            identity.provider === where.provider &&
            identity.providerSubject === where.providerSubject
        ) ?? null;

      if (!record) {
        return null;
      }

      return {
        ...record,
        user: state.users.find((user) => user.id === record.userId) ?? null,
      };
    },
    async save(next) {
      const record = { ...next };
      const index = state.identities.findIndex((identity) => identity.id === record.id);

      if (index === -1) {
        state.identities.push(record);
      } else {
        state.identities[index] = record;
      }

      return record;
    },
  };
}

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

// 中文注释：创建用户密码凭证仓库
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
    async findOne() {
      return null;
    },
  };
}

function createService() {
  const { AuthService } = require("../dist/modules/auth/auth.service.js");

  const state = {
    users: [],
    identities: [],
    preferences: [],
    passwordCredentials: [],
    sessions: [],
  };
  const tokenService = {
    createOpaqueToken() {
      return "refresh-token";
    },
    hashOpaqueToken() {
      return "refresh-token-hash";
    },
    getRefreshTokenTtlSeconds() {
      return 60 * 60;
    },
  };
  const service = new AuthService(
    createUserRepository(state),
    createUserIdentityRepository(state),
    createUserPreferenceRepository(state),
    createUserPasswordCredentialRepository(state),
    {},
    createAuthSessionRepository(state),
    tokenService
  );

  return { service, state };
}

async function testGoogleCallbackUsesRequestJsonFlow() {
  process.env.GOOGLE_CLIENT_ID = "google-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
  const requestCalls = [];

  const { service, state } = createService();
  service.requestJson = async (input) => {
    requestCalls.push(input);

    if (input.url.includes("/token")) {
      return {
        statusCode: 200,
        body: { access_token: "google-access" },
        rawBody: JSON.stringify({ access_token: "google-access" }),
      };
    }

    return {
      statusCode: 200,
      body: {
        sub: "google-user-1",
        email: "learner@example.com",
        name: "Test Learner",
        picture: "https://example.com/avatar.png",
      },
      rawBody: JSON.stringify({
        sub: "google-user-1",
        email: "learner@example.com",
        name: "Test Learner",
        picture: "https://example.com/avatar.png",
      }),
    };
  };
  const result = await service.handleGoogleCallback({
    code: "google-auth-code",
    state: Buffer.from(JSON.stringify({ next: "/practice" }), "utf8").toString(
      "base64url"
    ),
    context: {
      userAgent: "jest",
      ipAddress: "127.0.0.1",
    },
  });

  assert.equal(requestCalls.length, 2);
  assert.match(String(requestCalls[0].url), /oauth2\.googleapis\.com\/token/);
  assert.equal(requestCalls[0].method, "POST");
  assert.match(
    String(requestCalls[1].url),
    /openidconnect\.googleapis\.com\/v1\/userinfo/
  );
  assert.equal(requestCalls[1].headers.Authorization, "Bearer google-access");
  assert.equal(
    result.redirectUrl,
    "http://localhost:3000/login/callback?next=%2Fpractice"
  );
  assert.match(result.setCookie, /lcai_user_refresh_token=refresh-token/);
  assert.equal(state.users.length, 1);
  assert.equal(state.identities.length, 1);
  assert.equal(state.sessions.length, 1);
}

async function testGoogleCallbackSurfacesExchangeFailure() {
  process.env.GOOGLE_CLIENT_ID = "google-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";

  const { service } = createService();
  service.requestJson = async () => {
    throw new Error("curl failed");
  };

  await assert.rejects(
    service.handleGoogleCallback({
      code: "google-auth-code",
      state: Buffer.from(JSON.stringify({ next: "/" }), "utf8").toString("base64url"),
      context: {},
    }),
    (error) => {
      assert.equal(error.message, "curl failed");
      return true;
    }
  );
}

// 中文注释：测试 Google OAuth 回调拒绝隐式密码合并
async function testGoogleCallbackRejectsImplicitPasswordMerge() {
  process.env.GOOGLE_CLIENT_ID = "google-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";

  const { service, state } = createService();
  state.users.push({
    id: "user_existing",
    email: "learner@example.com",
    displayName: "Existing Learner",
    avatarUrl: null,
    status: "active",
    lastLoginAt: null,
  });
  state.passwordCredentials.push({
    userId: "user_existing",
    passwordHash: "scrypt$demo$hash",
    passwordAlgo: "scrypt",
    passwordUpdatedAt: new Date(),
  });

  service.requestJson = async (input) => {
    if (input.url.includes("/token")) {
      return {
        statusCode: 200,
        body: { access_token: "google-access" },
        rawBody: JSON.stringify({ access_token: "google-access" }),
      };
    }

    return {
      statusCode: 200,
      body: {
        sub: "google-user-2",
        email: "learner@example.com",
        name: "Google Learner",
        picture: null,
      },
      rawBody: JSON.stringify({
        sub: "google-user-2",
        email: "learner@example.com",
        name: "Google Learner",
        picture: null,
      }),
    };
  };

  await assert.rejects(
    service.handleGoogleCallback({
      code: "google-auth-code",
      state: Buffer.from(JSON.stringify({ next: "/" }), "utf8").toString("base64url"),
      context: {},
    }),
    (error) => {
      assert.equal(error.message, "This email is already registered.");
      return true;
    }
  );
}

Promise.resolve()
  .then(async () => {
    await testGoogleCallbackUsesRequestJsonFlow();
    console.log("PASS google oauth callback succeeds with requestJson");

    await testGoogleCallbackSurfacesExchangeFailure();
    console.log("PASS google oauth callback surfaces exchange failure");

    await testGoogleCallbackRejectsImplicitPasswordMerge();
    console.log("PASS google oauth callback rejects implicit password merge");
  })
  .catch((error) => {
    console.error("FAIL google oauth tests");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (typeof value === "undefined") {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });
