// Import Node.js Dependencies
import assert from "node:assert";
import { describe, it } from "node:test";

// Import Internal Dependencies
import {
  StatsCollector,
  type CollectedError,
  type OperationStat
} from "../src/index.ts";

type Phase = "fetch" | "parse";

/**
 * Both clocks advance by one unit on every read, so timestamps and durations
 * are deterministic and independent from the wall clock.
 */
function fakeClocks() {
  let wall = 1_000;
  let mono = 0;

  return {
    now: () => wall++,
    monotonicNow: () => mono++
  };
}

describe("StatsCollector", () => {
  describe("track()", () => {
    it("should return the value of a synchronous function unchanged", () => {
      const collector = new StatsCollector();

      const result = collector.track("sync", () => 42);

      assert.strictEqual(result, 42);
    });

    it("should record a fulfilled stat for a synchronous function", () => {
      const collector = new StatsCollector(fakeClocks());

      collector.track("sync", () => "ok");

      assert.deepStrictEqual(collector.operations, [{
        name: "sync",
        phase: undefined,
        startedAt: 1_001,
        executionTime: 1,
        status: "fulfilled",
        metadata: undefined
      }]);
    });

    it("should await and return the value of an asynchronous function", async() => {
      const collector = new StatsCollector();

      const result = await collector.track("async", async() => "ok");

      assert.strictEqual(result, "ok");
      assert.strictEqual(collector.operations[0].status, "fulfilled");
    });

    it("should record the stat of a thenable that is not a native Promise", async() => {
      const collector = new StatsCollector();
      const thenable = {
        then: (resolve: (value: string) => void) => resolve("ok")
      };

      const result = await collector.track("thenable", () => thenable);

      assert.strictEqual(result, "ok");
      assert.strictEqual(collector.operations.length, 1);
    });

    it("should rethrow and record the error of a synchronous function", () => {
      const collector = new StatsCollector(fakeClocks());
      const cause = new TypeError("boom");

      assert.throws(() => collector.track("sync", () => {
        throw cause;
      }), cause);

      const [operation] = collector.operations;
      assert.strictEqual(operation.status, "rejected");
      assert.strictEqual(operation.executionTime, 1);
      assert.strictEqual(
        operation.status === "rejected" ? operation.error.name : null,
        "TypeError"
      );
    });

    it("should rethrow and record the error of an asynchronous function", async() => {
      const collector = new StatsCollector();
      const cause = new Error("async boom");

      await assert.rejects(
        () => collector.track("async", () => Promise.reject(cause)),
        cause
      );

      assert.strictEqual(collector.operations.length, 1);
      assert.strictEqual(collector.errors.length, 1);
      assert.strictEqual(collector.errors[0].message, "async boom");
    });

    it("should record a rejected stat for a non-error thrown value", () => {
      const collector = new StatsCollector();

      assert.throws(() => collector.track("sync", () => {
        throw String("nope");
      }));

      assert.deepStrictEqual(collector.errors, [{
        name: "Error",
        message: "nope"
      }]);
    });

    it("should not throw when the thrown value cannot be stringified", () => {
      const collector = new StatsCollector();

      assert.throws(() => collector.track("sync", () => {
        throw Object.create(null);
      }));

      assert.deepStrictEqual(collector.errors, [{ name: "Error" }]);
    });
  });

  describe("metadata", () => {
    it("should attach the value returned by the metadata callback", async() => {
      const collector = new StatsCollector<string, { filesCount: number; }>();

      await collector.track("tarball", async() => ["a", "b"], {
        metadata: (files) => {
          return { filesCount: files.length };
        }
      });

      const [operation] = collector.operations;
      assert.deepStrictEqual(
        operation.status === "fulfilled" ? operation.metadata : null,
        { filesCount: 2 }
      );
    });

    it("should not call the metadata callback when the operation rejects", async() => {
      const collector = new StatsCollector<string, number>();
      let called = false;

      await assert.rejects(() => collector.track("tarball", () => Promise.reject(new Error("boom")), {
        metadata: () => {
          called = true;

          return 1;
        }
      }));

      assert.strictEqual(called, false);
    });
  });

  describe("phase()", () => {
    it("should attribute every operation tracked through the returned tracker", () => {
      const collector = new StatsCollector<Phase>();
      const fetching = collector.phase("fetch");

      fetching("registry", () => "ok");
      collector.phase("parse")("manifest", () => "ok");

      assert.deepStrictEqual(
        collector.operations.map((operation) => operation.phase),
        ["fetch", "parse"]
      );
    });

    it("should attribute failed operations to their phase", () => {
      const collector = new StatsCollector<Phase>();

      assert.throws(() => collector.phase("fetch")("registry", () => {
        throw new Error("boom");
      }));

      assert.strictEqual(collector.operations[0].phase, "fetch");
    });
  });

  describe("events", () => {
    it("should emit one operation event per tracked operation", async() => {
      const collector = new StatsCollector<Phase>();
      const emitted: OperationStat<Phase>[] = [];
      collector.on("operation", (stat) => emitted.push(stat));

      collector.track("sync", () => "ok");
      await assert.rejects(() => collector.track("async", () => Promise.reject(new Error("boom"))));

      assert.deepStrictEqual(
        emitted.map((stat) => [stat.name, stat.status]),
        [["sync", "fulfilled"], ["async", "rejected"]]
      );
    });

    it("should not throw when an operation fails without any listener", () => {
      const collector = new StatsCollector();

      assert.throws(() => collector.track("sync", () => {
        throw new Error("boom");
      }), { message: "boom" });
    });
  });

  describe("stats", () => {
    it("should expose counts and elapsed time", () => {
      const collector = new StatsCollector(fakeClocks());

      collector.track("first", () => "ok");
      assert.throws(() => collector.track("second", () => {
        throw new Error("boom");
      }));

      const stats = collector.stats;
      assert.strictEqual(stats.startedAt, 1_000);
      assert.strictEqual(stats.operationCount, 2);
      assert.strictEqual(stats.errorCount, 1);
      assert.strictEqual(stats.executionTime, 5);
    });

    it("should not expose the internal arrays", () => {
      const collector = new StatsCollector();
      collector.track("sync", () => "ok");

      (collector.stats.operations as OperationStat[]).length = 0;
      (collector.operations as OperationStat[]).length = 0;

      assert.strictEqual(collector.operations.length, 1);
    });
  });

  describe("reset()", () => {
    it("should drop collected operations and restart the clocks", () => {
      const collector = new StatsCollector(fakeClocks());
      collector.track("sync", () => "ok");

      collector.reset();

      const stats = collector.stats;
      assert.deepStrictEqual(stats.operations, []);
      assert.strictEqual(stats.operationCount, 0);
      assert.strictEqual(stats.startedAt, 1_002);
    });
  });

  describe("serializeError", () => {
    it("should use the consumer serializer to widen the collected error", () => {
      type HttpError = CollectedError & { statusCode?: number; };

      const collector = new StatsCollector<Phase, never, HttpError>({
        serializeError: (cause) => {
          return {
            name: "HTTPError",
            statusCode: (cause as { statusCode: number; }).statusCode
          };
        }
      });

      assert.throws(() => collector.track("registry", () => {
        // eslint-disable-next-line
        throw { statusCode: 404 };
      }));

      assert.deepStrictEqual(collector.errors, [{
        name: "HTTPError",
        statusCode: 404
      }]);
    });
  });
});
