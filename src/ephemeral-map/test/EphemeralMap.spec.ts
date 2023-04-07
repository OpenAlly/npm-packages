// Import Node.js Dependencies
import { describe, it, test } from "node:test";
import { EventEmitter, once } from "node:events";
import assert from "node:assert/strict";

// Import Internal Dependencies
import EphemeralMap, { tSv } from "../src/index";

describe("EphemeralMap", () => {
  test("should work like an ECMAScript Map", () => {
    const em = new EphemeralMap();

    em.set("foo", "bar");
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

    const pair = await once(em.events, EphemeralMap.Expired);
    assert.deepEqual(pair, ["foo", "bar"]);
  });

  describe("constructor", () => {
    it("should be instanceof Map", () => {
      const em = new EphemeralMap();

      assert.ok(em instanceof Map);
    });

    it("should have an EventEmitter on a public events property", () => {
      const em = new EphemeralMap();

      assert.ok(em.events instanceof EventEmitter);
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

      const pair = await once(em.events, EphemeralMap.Expired);
      assert.deepEqual(pair, ["foo", "bar"]);
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
