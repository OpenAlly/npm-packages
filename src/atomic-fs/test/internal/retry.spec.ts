// Import Node.js Dependencies
import assert from "node:assert";
import { describe, it } from "node:test";

// Import Internal Dependencies
import { defaultRetry, resolveRetry, withRetry } from "../../src/internal/retry.ts";
import { errnoError } from "../helpers/fsStub.ts";

describe("resolveRetry", () => {
  it("should disable retries when asked", () => {
    assert.strictEqual(resolveRetry(false), null);
  });

  it("should default to the platform policy", () => {
    assert.deepStrictEqual(
      resolveRetry(undefined),
      process.platform === "win32" ? defaultRetry : null
    );
  });

  it("should fill the gaps of a partial policy", () => {
    assert.deepStrictEqual(resolveRetry({ attempts: 9 }), {
      ...defaultRetry,
      attempts: 9
    });
  });
});

describe("withRetry", () => {
  it("should call the operation once when retries are off", async() => {
    let calls = 0;

    const result = await withRetry(() => {
      calls++;

      return Promise.resolve("ok");
    }, null);

    assert.strictEqual(result, "ok");
    assert.strictEqual(calls, 1);
  });

  it("should not loop when a single attempt is allowed", async() => {
    let calls = 0;

    await assert.rejects(
      () => withRetry(() => {
        calls++;

        return Promise.reject(errnoError("EBUSY"));
      }, { attempts: 1, delay: 1, factor: 1 }),
      { code: "EBUSY" }
    );

    assert.strictEqual(calls, 1);
  });

  it("should stop as soon as the operation succeeds", async() => {
    let calls = 0;

    const result = await withRetry(() => {
      calls++;

      return calls < 3
        ? Promise.reject(errnoError("EPERM"))
        : Promise.resolve("ok");
    }, { attempts: 5, delay: 1, factor: 2 });

    assert.strictEqual(result, "ok");
    assert.strictEqual(calls, 3);
  });

  it("should give up on a code it cannot retry", async() => {
    let calls = 0;

    await assert.rejects(
      () => withRetry(() => {
        calls++;

        return Promise.reject(errnoError("ENOSPC"));
      }, { attempts: 5, delay: 1, factor: 1 }),
      { code: "ENOSPC" }
    );

    assert.strictEqual(calls, 1);
  });

  it("should surface the last failure once exhausted", async() => {
    let calls = 0;

    await assert.rejects(
      () => withRetry(() => {
        calls++;

        return Promise.reject(errnoError("EACCES"));
      }, { attempts: 3, delay: 1, factor: 1 }),
      { code: "EACCES" }
    );

    assert.strictEqual(calls, 3);
  });

  it("should rethrow a plain error without a code", async() => {
    await assert.rejects(
      () => withRetry(
        () => Promise.reject(new Error("boom")),
        { attempts: 3, delay: 1, factor: 1 }
      ),
      /boom/
    );
  });
});
