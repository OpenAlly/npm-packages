// Import Node.js Dependencies
import path from "node:path";
import { fileURLToPath } from "node:url";

// Import Third-party Dependencies
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname
});

const config = [
  {
    ignores: [
      "**/node_modules/",
      "**/dist/",
      "**/tmp/",
      "**/fixtures/",
      "**/coverage/",
    ],
  }, ...compat.extends("@openally/eslint-config"), {
    languageOptions: {
      ecmaVersion: 2023,
      parserOptions: {
        requireConfigFile: false,
      },
    },
    files: ["**/*.ts", "**/*.js"],
  }
];

export default config;
