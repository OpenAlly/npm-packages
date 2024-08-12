// Import Node.js Dependencies
import { test } from "node:test";
import assert from "node:assert/strict";

// Import Third-party Dependencies
import { ESLint, type Linter } from "eslint";

// Import Internal Dependencies
import { typescriptConfig, ESLintConfig } from "../src/index.js";

test("should lint valid JavaScript", async() => {
  const eslint = new ESLint({
    baseConfig: ESLintConfig as Linter.Config
  });
  const [result] = await eslint.lintFiles(["./test/fixtures/pass.js"]);

  assert.strictEqual(result.warningCount, 0);
  assert.strictEqual(result.errorCount, 0);
});

test("should lint invalid JavaScript", async() => {
  const eslint = new ESLint({
    baseConfig: ESLintConfig as Linter.Config
  });
  const [result] = await eslint.lintFiles(["./test/fixtures/fail.js"]);

  assert.strictEqual(result.warningCount, 0);
  assert.strictEqual(result.errorCount, 1);
  assert.strictEqual(result.messages[0].message, "Missing semicolon.");
});

test("should lint valid TypeScript", async() => {
  const eslint = new ESLint({
    baseConfig: typescriptConfig() as Linter.Config
  });
  const [result] = await eslint.lintFiles(["./test/fixtures/pass.ts"]);

  assert.strictEqual(result.warningCount, 0);
  assert.strictEqual(result.errorCount, 0);
});

test("should lint invalid TypeScript", async() => {
  const eslint = new ESLint({
    baseConfig: typescriptConfig() as any
  });
  const [result] = await eslint.lintFiles(["./test/fixtures/fail.ts"]);

  assert.strictEqual(result.warningCount, 0);
  assert.strictEqual(result.errorCount, 1);
  assert.strictEqual(result.messages[0].message, "Missing semicolon.");
});
