const { FlatCompat } = require("@eslint/eslintrc");
const importPlugin = require("eslint-plugin-import");
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");

const compat = new FlatCompat({ baseDirectory: __dirname });

module.exports = [
  { ignores: ["dist/**", "node_modules/**", "*.js"] },
  ...compat.extends("plugin:import/recommended"),
  ...compat.extends("plugin:import/typescript"),
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": ["error"],
    },
  },
];

