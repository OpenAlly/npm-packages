// Import Node.js Dependencies
import { test } from "node:test";
import assert from "node:assert/strict";

// Import Third-party Dependencies
import { ESLint } from "eslint";

// Import Internal Dependencies
import config from "../index.js";
config.parserOptions.requireConfigFile = false;

test("ESLint Config", async() => {
  const eslint = new ESLint({
    overrideConfigFile: "eslint.config.mjs"
  });
  const [result] = await eslint.lintText("");

  assert.strictEqual(result.warningCount, 0);
  assert.strictEqual(result.errorCount, 0);
});
