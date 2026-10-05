/** @type {import('jest').Config} */
module.exports = {
  rootDir: __dirname,
  testEnvironment: "node",
  // Run only the CJS tests that have been migrated to Jest. The remaining tests
  // continue to run directly under Node until their own migration change.
  testMatch: [
    "<rootDir>/test/auth-password-and-api-response.test.cjs",
    "<rootDir>/test/auth-google-oauth.test.cjs",
    "<rootDir>/test/realtime-voice.test.cjs",
  ],
  clearMocks: true, // Automatically clear mock calls and instances between every test
  restoreMocks: true, // Automatically restore mock state between every test
  verbose: true, // Display individual test results with the test suite hierarchy
};
