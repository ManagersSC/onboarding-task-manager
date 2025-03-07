// jest.config.js
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment.
  dir: "./",
});

const customJestConfig = {
  testEnvironment: "node", // Use "node" for API routes (server-side)
  // Ensure that Babel is used to transform JavaScript files:
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
  },
};

module.exports = createJestConfig(customJestConfig);
