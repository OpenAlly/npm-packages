// Import Node.js Dependencies
import assert from "node:assert";
import nodeFs from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { describe, it } from "node:test";

// Import Internal Dependencies
import { acquire, acquireAll, lockPaths, pending } from "../../src/internal/queue.ts";
import { always } from "../helpers/fsStub.ts";
import { tempWorkspace } from "../helpers/tempWorkspace.ts";

describe("queue", () => {
  it("should run holders of the same key one at a time", async() => {
    const order: string[] = [];

    async function critical(
      label: string,
      delay: number
    ) {
      await using _lock = await acquire("same");
      order.push(`${label}:enter`);
      await sleep(delay);
      order.push(`${label}:leave`);
    }

    await Promise.all([
      critical("a", 20),
      critical("b", 1),
      critical("c", 1)
    ]);

    assert.deepStrictEqual(order, [
      "a:enter", "a:leave",
      "b:enter", "b:leave",
      "c:enter", "c:leave"
    ]);
  });

  it("should let different keys overlap", async() => {
    const order: string[] = [];

    async function critical(
      key: string,
      delay: number
    ) {
      await using _lock = await acquire(key);
      order.push(`${key}:enter`);
      await sleep(delay);
      order.push(`${key}:leave`);
    }

    await Promise.all([
      critical("a", 20),
      critical("b", 1)
    ]);

    assert.deepStrictEqual(order, [
      "a:enter", "b:enter", "b:leave", "a:leave"
    ]);
  });

  it("should release the key when the holder throws", async() => {
    await assert.rejects(async() => {
      await using _lock = await acquire("throwing");
      throw new Error("boom");
    });

    await using _lock = await acquire("throwing");
    assert.ok(true);
  });

  it("should evict a key once nobody holds it", async() => {
    const before = pending();
    {
      await using _lock = await acquire("evicted");
      assert.strictEqual(pending(), before + 1);
    }

    assert.strictEqual(pending(), before);
  });

  it("should be idempotent on a double dispose", async() => {
    const lock = await acquire("idempotent");
    lock[Symbol.dispose]();
    lock[Symbol.dispose]();

    await using _next = await acquire("idempotent");
    assert.ok(true);
  });

  describe("acquireAll", () => {
    it("should not deadlock on two holders taking the same pair in opposite orders", async() => {
      const done: string[] = [];

      async function swap(
        label: string,
        keys: string[]
      ) {
        await using _lock = await acquireAll(keys);
        await sleep(5);
        done.push(label);
      }

      await Promise.all([
        swap("forward", ["left", "right"]),
        swap("backward", ["right", "left"])
      ]);

      assert.strictEqual(done.length, 2);
    });

    it("should collapse a duplicated key instead of self-deadlocking", async() => {
      await using _lock = await acquireAll(["dup", "dup"]);

      assert.ok(true);
    });

    it("should release every key it took", async() => {
      const before = pending();
      {
        await using _lock = await acquireAll(["one", "two"]);
        assert.strictEqual(pending(), before + 2);
      }

      assert.strictEqual(pending(), before);
    });
  });
});

describe("lockPaths", () => {
  it("should hand back the true name of every path in order", async() => {
    await using workspace = await tempWorkspace();
    const existing = await workspace.write("a.txt", "a");
    const missing = workspace.resolve("missing.txt");

    using lock = await lockPaths(nodeFs, [missing, existing]);

    assert.deepStrictEqual(lock.truenames, [
      missing,
      await nodeFs.realpath(existing)
    ]);
  });

  it("should serialize two spellings that resolve to the same file", async() => {
    const order: string[] = [];
    const fs = { realpath: () => Promise.resolve("/same/file") };

    async function critical(
      spelling: string,
      delay: number
    ) {
      using _lock = await lockPaths(fs, [spelling]);
      order.push(`${spelling}:enter`);
      await sleep(delay);
      order.push(`${spelling}:leave`);
    }

    await Promise.all([
      critical("/link", 20),
      critical("/LINK", 1)
    ]);

    assert.deepStrictEqual(order, [
      "/link:enter", "/link:leave",
      "/LINK:enter", "/LINK:leave"
    ]);
  });

  it("should release what it took and rethrow when realpath fails", async() => {
    const fs = { realpath: always("ELOOP") };

    await assert.rejects(() => lockPaths(fs, ["/loop"]), { code: "ELOOP" });

    using _lock = await lockPaths(nodeFs, ["/loop"]);
    assert.ok(true);
  });
});
