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

  it("subscribe() forwards arguments until unsubscribed", () => {
    const emitter = new Emitter<Events>();
    const received: [number, string][] = [];
    const unsubscribe = emitter.subscribe("foo", (a, b) => {
      received.push([a, b]);
    });

    emitter.emit("foo", 1, "hello");
    emitter.emit("foo", 2, "world");
    unsubscribe();

    assert.strictEqual(emitter.emit("foo", 3, "ignored"), false);
    assert.deepStrictEqual(received, [[1, "hello"], [2, "world"]]);
  });

  it("unsubscribe() removes only its own registration and is idempotent", () => {
    const emitter = new Emitter<Events>();
    let calls = 0;
    function listener() {
      calls++;
    }
    emitter.on("bar", listener);
    const first = emitter.subscribe("bar", listener);
    const second = emitter.subscribe("bar", listener);
    const [regular, firstWrapper, secondWrapper] = emitter.rawListeners("bar");

    second();
    second();

    assert.deepStrictEqual(emitter.rawListeners("bar"), [regular, firstWrapper]);
    assert.notStrictEqual(firstWrapper, secondWrapper);
    emitter.emit("bar");
    assert.strictEqual(calls, 2);

    first();
    first();
    assert.deepStrictEqual(emitter.rawListeners("bar"), [listener]);
  });

  it("subscribe() supports symbol events", () => {
    const key = Symbol("change");
    const emitter = new Emitter<{ [key]: (value: number) => void; }>();
    let received = 0;
    const unsubscribe = emitter.subscribe(key, (value) => {
      received = value;
    });

    emitter.emit(key, 42);
    unsubscribe();

    assert.strictEqual(received, 42);
    assert.strictEqual(emitter.emit(key, 99), false);
  });

  it("subscriptions expose the original callback and support off()", () => {
    const emitter = new Emitter<Events>();
    function listener() {
      return void 0;
    }
    const unsubscribe = emitter.subscribe("bar", listener);

    assert.deepStrictEqual(emitter.listeners("bar"), [listener]);
    assert.notStrictEqual(emitter.rawListeners("bar")[0], listener);
    emitter.off("bar", listener);
    assert.strictEqual(emitter.listenerCount("bar"), 0);

    emitter.subscribe("bar", listener);
    unsubscribe();
    assert.strictEqual(emitter.listenerCount("bar"), 1);
  });

  it("old unsubscribe functions leave registrations added after removeAllListeners() intact", () => {
    const emitter = new Emitter<Events>();
    function listener() {
      return void 0;
    }
    const unsubscribe = emitter.subscribe("bar", listener);

    emitter.removeAllListeners();
    emitter.subscribe("bar", listener);
    unsubscribe();
    unsubscribe();

    assert.strictEqual(emitter.listenerCount("bar"), 1);
  });

  it("unsubscribe() preserves the current emission's listener snapshot", () => {
    const emitter = new Emitter<Events>();
    const calls: string[] = [];
    emitter.on("bar", () => {
      calls.push("first");
      unsubscribe();
    });
    const unsubscribe = emitter.subscribe("bar", () => {
      calls.push("second");
    });

    emitter.emit("bar");
    emitter.emit("bar");

    assert.deepStrictEqual(calls, ["first", "second", "first"]);
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
