/** @type {import("jest").Config} */
module.exports = {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  roots: ["<rootDir>/src"],
  testMatch: [
    "<rootDir>/src/modules/contacts/import/__tests__/xlsx-scale.test.ts",
    "<rootDir>/src/modules/contacts/import/__tests__/orchestration.scale.test.ts",
    "<rootDir>/src/modules/contacts/import/__tests__/integration/e2e-100k.dual-worker.test.ts",
  ],
  testTimeout: 600_000,
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          target: "ES2022",
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          isolatedModules: true,
        },
      },
    ],
  },
};
