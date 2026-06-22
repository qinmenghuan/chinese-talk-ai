const assert = require("node:assert/strict");
require("reflect-metadata");

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

function createService() {
  const { AuthService } = require("../dist/modules/auth/auth.service.js");

  const state = {
    users: [],
    preferences: [],
    passwordCredentials: [],
    sessions: [],
    failNextUserSaveWithDuplicateEmail: false,
  };
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

async function testCreateApiResponseUsesProjectEnvelope() {
  const { createApiResponse } = require("../dist/common/dto/api-response.dto.js");

  assert.deepEqual(createApiResponse({ success: true }), {
    code: 200,
    message: "",
    data: { success: true },
  });
}

async function testRegisterUserCreatesCredentialAndPreference() {
  const { service, state } = createService();

  const result = await service.registerUser({
    email: "learner@example.com",
    password: "example123",
    confirmPassword: "example123",
  });

  assert.deepEqual(result, { success: true });
  assert.equal(state.users.length, 1);
  assert.equal(state.users[0].email, "learner@example.com");
  assert.equal(state.preferences.length, 1);
  assert.equal(state.passwordCredentials.length, 1);
  assert.match(state.passwordCredentials[0].passwordHash, /^scrypt\$/);
}

async function testRegisterUserRejectsDuplicateEmail() {
  const { service } = createService();

  await service.registerUser({
    email: "learner@example.com",
    password: "example123",
    confirmPassword: "example123",
  });

  await assert.rejects(
    service.registerUser({
      email: "learner@example.com",
      password: "example123",
      confirmPassword: "example123",
    }),
    (error) => {
      assert.equal(error.message, "This email is already registered.");
      return true;
    }
  );
}

async function testRegisterUserMapsDuplicateConstraintToConflict() {
  const { service, state } = createService();
  state.failNextUserSaveWithDuplicateEmail = true;

  await assert.rejects(
    service.registerUser({
      email: "learner@example.com",
      password: "example123",
      confirmPassword: "example123",
    }),
    (error) => {
      assert.equal(error.message, "This email is already registered.");
      return true;
    }
  );
}

async function testLoginUserCreatesSession() {
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

  assert.equal(result.user.email, "learner@example.com");
  assert.equal(result.accessToken, `access-token-for-${result.user.id}`);
  assert.match(result.setCookie, /lcai_user_refresh_token=refresh-token/);
  assert.equal(state.sessions.length, 1);
  assert.ok(state.users[0].lastLoginAt instanceof Date);
}

async function testLoginUserRejectsWrongPassword() {
  const { service } = createService();

  await service.registerUser({
    email: "learner@example.com",
    password: "example123",
    confirmPassword: "example123",
  });

  await assert.rejects(
    service.loginUser(
      {
        email: "learner@example.com",
        password: "wrongpass123",
      },
      {}
    ),
    (error) => {
      assert.equal(error.message, "Email or password is incorrect.");
      return true;
    }
  );
}

Promise.resolve()
  .then(async () => {
    await testCreateApiResponseUsesProjectEnvelope();
    console.log("PASS api response envelope");

    await testRegisterUserCreatesCredentialAndPreference();
    console.log("PASS password registration");

    await testRegisterUserRejectsDuplicateEmail();
    console.log("PASS duplicate registration rejection");

    await testRegisterUserMapsDuplicateConstraintToConflict();
    console.log("PASS duplicate registration database conflict mapping");

    await testLoginUserCreatesSession();
    console.log("PASS password login session creation");

    await testLoginUserRejectsWrongPassword();
    console.log("PASS password login wrong password rejection");
  })
  .catch((error) => {
    console.error("FAIL password auth tests");
    console.error(error);
    process.exit(1);
  });
