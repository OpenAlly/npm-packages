// Import Node.js Dependencies
import assert from "node:assert";
import { describe, it } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";

// Import Internal Dependencies
import { Emitter, once, on, addAbortListener } from "../src/index.ts";

type Events = {
  foo: (a: number, b: string) => void;
  bar: () => void;
};

describe("once()", () => {
  it("resolves with the arguments of the next matching emit()", async() => {
    const emitter = new Emitter<Events>();

    const pending = once(emitter, "foo");
    emitter.emit("foo", 1, "hello");

    assert.deepStrictEqual(await pending, [1, "hello"]);
  });

  it("removes its internal listener once resolved", async() => {
    const emitter = new Emitter<Events>();

    await Promise.all([
      once(emitter, "foo"),
      Promise.resolve().then(() => emitter.emit("foo", 1, "hello"))
    ]);

    assert.strictEqual(emitter.listenerCount("foo"), 0);
  });

  it("rejects immediately when called with an already-aborted signal", async() => {
    const emitter = new Emitter<Events>();
    const controller = new AbortController();
    controller.abort();

    await assert.rejects(once(emitter, "foo", { signal: controller.signal }));
    assert.strictEqual(emitter.listenerCount("foo"), 0);
  });

  it("rejects and cleans up its listener when the signal aborts while waiting", async() => {
    const emitter = new Emitter<Events>();
    const controller = new AbortController();

    const pending = once(emitter, "foo", { signal: controller.signal });
    controller.abort();

    await assert.rejects(pending);
    assert.strictEqual(emitter.listenerCount("foo"), 0);
  });
});

describe("on()", () => {
  it("yields one tuple per emit() in order", async() => {
    const emitter = new Emitter<Events>();
    const received: unknown[] = [];

    const controller = new AbortController();
    const iteration = (async() => {
      for await (const args of on(emitter, "foo", { signal: controller.signal })) {
        received.push(args);
      }
    })();

    emitter.emit("foo", 1, "a");
    emitter.emit("foo", 2, "b");
    await sleep(0);
    controller.abort();
    await iteration.catch(() => void 0);

    assert.deepStrictEqual(received, [[1, "a"], [2, "b"]]);
  });

  it("stops iterating and cleans up its listener when the signal aborts", async() => {
    const emitter = new Emitter<Events>();
    const controller = new AbortController();

    const iteration = (async() => {
      for await (const _ of on(emitter, "foo", { signal: controller.signal })) {
        // drained via the abort below
      }
    })();

    controller.abort();
    await assert.rejects(iteration);

    assert.strictEqual(emitter.listenerCount("foo"), 0);
  });
});

describe("addAbortListener()", () => {
  it("invokes the listener when the signal aborts", async() => {
    const controller = new AbortController();
    let called = false;

    addAbortListener(controller.signal, () => {
      called = true;
    });
    controller.abort();
    await sleep(0);

    assert.strictEqual(called, true);
  });

  it("invokes the listener via queueMicrotask when the signal is already aborted", async() => {
    const controller = new AbortController();
    controller.abort();
    let called = false;

    addAbortListener(controller.signal, () => {
      called = true;
    });
    await sleep(0);

    assert.strictEqual(called, true);
  });

  it("[Symbol.dispose]() removes the listener before it fires", async() => {
    const controller = new AbortController();
    let called = false;

    const disposable = addAbortListener(controller.signal, () => {
      called = true;
    });
    disposable[Symbol.dispose]();
    controller.abort();
    await sleep(0);

    assert.strictEqual(called, false);
  });
});
