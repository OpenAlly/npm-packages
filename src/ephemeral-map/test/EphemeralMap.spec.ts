// Import Node.js Dependencies
import { describe, it, test, mock } from "node:test";
import { EventEmitter, once } from "node:events";
import assert from "node:assert/strict";
import timers from "node:timers/promises";

// Import Third-party Dependencies
import { EventListener } from "iterator-matcher";

// Import Internal Dependencies
import EphemeralMap, { tSv, INTERNAL_STORE } from "../src/index";

describe("EphemeralMap", () => {
  test("should work like an ECMAScript Map", () => {
    const em = new EphemeralMap();

    em.set("foo", "bar");
    assert.ok(em.has("foo"));
    assert.strictEqual(em.get("foo"), "bar");
    assert.deepEqual([...em.keys()], ["foo"]);
    assert.deepEqual([...em.values()], ["bar"]);
    assert.deepEqual([...em.entries()], [["foo", "bar"]]);
    assert.deepEqual([...em], [["foo", "bar"]]);
    assert.strictEqual(em.size, 1);

    em.set("nana", "lal");
    assert.strictEqual(em.size, 2);
    em.delete("nana");
    assert.strictEqual(em.size, 1);

    em.clear();
    assert.strictEqual(em.size, 0);
  });

  test("should trigger new events after elapsed ttl", async() => {
    const em = new EphemeralMap(void 0, {
      ttl: 20,
      keepEventLoopAlive: true
    });
    em.set("foo", "bar");

    const pair = await once(em, EphemeralMap.Expired);
    assert.deepEqual(pair, ["foo", "bar"]);
  });

  test("should expose internal TimeStore under an exported Symbol", () => {
    assert.ok(typeof INTERNAL_STORE === "symbol");
    const em = new EphemeralMap(void 0, {
      ttl: 20,
      keepEventLoopAlive: true
    });

    const store = em[INTERNAL_STORE];
    assert.equal(store.ttl, 20);
  });

  describe("constructor", () => {
    it("should be an instanceof EventEmitter", () => {
      const em = new EphemeralMap();

      assert.ok(em instanceof EventEmitter);
    });

    it("should create a new EphemeralMap instance with an iterable", () => {
      const em = new EphemeralMap([
        ["foo", "bar"],
        ["yo", "lol"]
      ]);

      assert.deepEqual([...em.keys()], ["foo", "yo"]);
    });
  });

  describe("set", () => {
    it("should be able to set from a tsvResponse", () => {
      const em = new EphemeralMap();

      const value = tSv({ ttl: 500 })("foo");
      em.set(value, "bar");

      assert.strictEqual(em.get("foo"), "bar");
      em.clear();
    });
  });

  describe("get", () => {
    it("should refresh existing identifier if option refreshOnGet is enabled", () => {
      const em = new EphemeralMap(void 0, {
        ttl: 20,
        refreshOnGet: true
      });
      EphemeralMap.set(em, ["foo", "bar"], { ttl: 0 });

      const eeListener = new EventListener(em, EphemeralMap.Renewed);

      const value = em.get("foo");
      assert.equal(value, "bar");
      assert.equal(eeListener.listenerCount, 1);

      const timestore = em[INTERNAL_STORE];
      const { ttl } = timestore.get("foo")!;
      assert.equal(ttl, 0);
    });
  });

  describe("forEach", () => {
    it("should trigger mocked fn on all identifiers available in the Map", () => {
      const em = new EphemeralMap();
      const callback = mock.fn();

      em.set("foo", "bar");
      em.set("nah", "lol");

      em.forEach(callback);

      const calls = callback.mock.calls;
      assert.equal(calls.length, 2);
      for (const call of calls) {
        call.arguments.pop();
      }
      assert.deepEqual(calls[0].arguments, ["bar", "foo"]);
      assert.deepEqual(calls[1].arguments, ["lol", "nah"]);
    });
  });

  describe("emplace", () => {
    it("should insert new value if no matching key is detected", () => {
      const em = new EphemeralMap<string, { failure: number }>();

      const value = em.emplace("foo", {
        insert() {
          return { failure: 0 };
        }
      });

      assert.ok(em.has("foo"));
      const expectedValue = { failure: 0 };
      assert.deepEqual(value, expectedValue);
      assert.deepEqual(em.get("foo"), expectedValue);
    });

    it("should update old value", () => {
      const em = new EphemeralMap<string, { failure: number }>();
      em.set("foo", { failure: 0 });

      const value = em.emplace("foo", {
        update(oldValue) {
          return { failure: oldValue.failure + 1 };
        }
      });

      const expectedValue = { failure: 1 };
      assert.deepEqual(value, expectedValue);
      assert.deepEqual(em.get("foo"), expectedValue);
    });

    it("should update old value and ignore insert because the given key already exist", () => {
      const em = new EphemeralMap<string, { failure: number }>();
      em.set("foo", { failure: 10 });

      const value = em.emplace("foo", {
        update(oldValue) {
          return { failure: oldValue.failure + 1 };
        },
        insert() {
          return { failure: 0 };
        }
      });

      const expectedValue = { failure: 11 };
      assert.deepEqual(value, expectedValue);
      assert.deepEqual(em.get("foo"), expectedValue);
    });

    it("should return undefined if handler is empty (which is illegal with TS)", () => {
      const em = new EphemeralMap();

      const value = em.emplace("foo", {} as any);
      assert.equal(value, undefined);
    });
  });

  describe("static set", () => {
    it("should set a pair (key, value) on a ES6 Map", () => {
      const map = new Map();

      EphemeralMap.set(map, ["foo", "bar"]);
      assert.strictEqual(map.get("foo"), "bar");
    });

    it("should set a pair (key, value) on an EphemeralMap", () => {
      const em = new EphemeralMap();

      EphemeralMap.set(em, ["foo", "bar"]);
      assert.strictEqual(em.get("foo"), "bar");
    });

    it("should set a pair (key, value) on an EphemeralMap with a TTL", async() => {
      const em = new EphemeralMap(void 0, {
        keepEventLoopAlive: true
      });

      EphemeralMap.set(em, ["foo", "bar"], { ttl: 20 });

      const pair = await once(em, EphemeralMap.Expired);
      assert.deepEqual(pair, ["foo", "bar"]);
    });
  });

  describe("clear", () => {
    it("should clear active keys (and clear internal Store)", async() => {
      const em = new EphemeralMap(void 0, { ttl: 50 });
      let counter = 0;
      em.on(EphemeralMap.Expired, () => counter++);

      em.set("foo", "bar");
      em.clear();
      assert.ok(!em.has("foo"));

      await timers.setTimeout(100);
      assert.strictEqual(counter, 0);
    });
  });

  describe("ttl", () => {
    it("should return zero if no ttl is provided in constructor options", () => {
      const em = new EphemeralMap();

      assert.strictEqual(em.ttl, 0);
    });

    it("should return the provided customized ttl", () => {
      const em = new EphemeralMap(void 0, {
        ttl: 500
      });

      assert.strictEqual(em.ttl, 500);
      em.clear();
    });
  });
});
