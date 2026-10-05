/** @type {import('jest').Config} */
module.exports = {
  rootDir: __dirname,
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/auth-password-and-api-response.test.cjs"],
  clearMocks: true, // Automatically clear mock calls and instances between every test
  restoreMocks: true, // Automatically restore mock state between every test
  verbose: true, // Display individual test results with the test suite hierarchy
};
