// Import Node.js Dependencies
import assert from "node:assert";
import { describe, it } from "node:test";

// Import Internal Dependencies
import { Emitter } from "../src/index.ts";

type Events = {
  foo: (a: number, b: string) => void;
  bar: () => void;
  [key: string]: (...args: any[]) => void;
  [key: symbol]: (...args: any[]) => void;
};

describe("Emitter", () => {
  it("should call a registered listener with emit() args", () => {
    const emitter = new Emitter<Events>();
    let received: [number, string] | null = null;
    emitter.on("foo", (a, b) => {
      received = [a, b];
    });

    const handled = emitter.emit("foo", 1, "hello");

    assert.strictEqual(handled, true);
    assert.deepStrictEqual(received, [1, "hello"]);
  });

  it("should return false from emit() when there are no listeners", () => {
    const emitter = new Emitter<Events>();
    assert.strictEqual(emitter.emit("bar"), false);
  });

  it("should support symbol event keys", () => {
    const emitter = new Emitter<Events>();
    const key = Symbol.for("baz");
    let payload: unknown = null;
    emitter.on(key, (p: unknown) => {
      payload = p;
    });

    emitter.emit(key, { ok: true });
    assert.deepStrictEqual(payload, { ok: true });
  });

  it("once() should only fire a single time", () => {
    const emitter = new Emitter<Events>();
    let calls = 0;
    emitter.once("bar", () => {
      calls++;
    });

    emitter.emit("bar");
    emitter.emit("bar");

    assert.strictEqual(calls, 1);
    assert.strictEqual(emitter.listenerCount("bar"), 0);
  });

  it("off() removes a listener added via on()", () => {
    const emitter = new Emitter<Events>();
    function listener() {
      return;
    }
    emitter.on("bar", listener);
    emitter.off("bar", listener);

    assert.strictEqual(emitter.listenerCount("bar"), 0);
    assert.strictEqual(emitter.emit("bar"), false);
  });

  it("off() removes a listener added via once() using the original function reference", () => {
    const emitter = new Emitter<Events>();
    function listener() {
      return;
    }
    emitter.once("bar", listener);
    emitter.off("bar", listener);

    assert.strictEqual(emitter.listenerCount("bar"), 0);
  });

  it("prependListener() runs before previously registered listeners", () => {
    const emitter = new Emitter<Events>();
    const order: string[] = [];
    emitter.on("bar", () => order.push("second"));
    emitter.prependListener("bar", () => order.push("first"));

    emitter.emit("bar");

    assert.deepStrictEqual(order, ["first", "second"]);
  });

  it("prependOnceListener() runs first and only once", () => {
    const emitter = new Emitter<Events>();
    const order: string[] = [];
    emitter.on("bar", () => order.push("second"));
    emitter.prependOnceListener("bar", () => order.push("first"));

    emitter.emit("bar");
    emitter.emit("bar");

    assert.deepStrictEqual(order, ["first", "second", "second"]);
  });

  it("removeAllListeners(event) clears listeners for a single event only", () => {
    const emitter = new Emitter<Events>();
    emitter.on("foo", () => void 0);
    emitter.on("bar", () => void 0);

    emitter.removeAllListeners("foo");

    assert.strictEqual(emitter.listenerCount("foo"), 0);
    assert.strictEqual(emitter.listenerCount("bar"), 1);
  });

  it("removeAllListeners() with no argument clears every event", () => {
    const emitter = new Emitter<Events>();
    emitter.on("foo", () => void 0);
    emitter.on("bar", () => void 0);

    emitter.removeAllListeners();

    assert.deepStrictEqual(emitter.eventNames(), []);
  });

  it("eventNames() returns both string and symbol keys currently registered", () => {
    const emitter = new Emitter<Events>();
    const key = Symbol.for("baz");
    emitter.on("foo", () => void 0);
    emitter.on(key, () => void 0);

    assert.deepStrictEqual(emitter.eventNames(), ["foo", key]);
  });

  it("listeners() unwraps once-listeners back to the original function", () => {
    const emitter = new Emitter<Events>();
    function listener() {
      return;
    }
    emitter.once("bar", listener);

    assert.deepStrictEqual(emitter.listeners("bar"), [listener]);
  });

  it("rawListeners() returns the internal wrapper for once-listeners", () => {
    const emitter = new Emitter<Events>();
    function listener() {
      return;
    }
    emitter.once("bar", listener);

    const [raw] = emitter.rawListeners("bar");
    assert.notStrictEqual(raw, listener);
  });

  it("still invokes a listener removed mid-emit by another listener (safe iteration snapshot)", () => {
    const emitter = new Emitter<Events>();
    const calls: string[] = [];
    function second() {
      calls.push("second");
    }
    emitter.on("bar", () => {
      calls.push("first");
      emitter.off("bar", second);
    });
    emitter.on("bar", second);

    emitter.emit("bar");

    assert.deepStrictEqual(calls, ["first", "second"]);
  });

  it("getMaxListeners()/setMaxListeners() round-trip the configured value", () => {
    const emitter = new Emitter<Events>();
    assert.strictEqual(emitter.getMaxListeners(), 10);

    emitter.setMaxListeners(2);
    assert.strictEqual(emitter.getMaxListeners(), 2);
  });

  it("warns via console.warn when listener count exceeds maxListeners", () => {
    const emitter = new Emitter<Events>().setMaxListeners(1);
    const originalWarn = console.warn;
    let warned = false;
    console.warn = () => {
      warned = true;
    };

    try {
      emitter.on("bar", () => void 0);
      emitter.on("bar", () => void 0);
    }
    finally {
      console.warn = originalWarn;
    }

    assert.strictEqual(warned, true);
  });
});
