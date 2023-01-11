// Import Node.js Dependencies
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Import Internal Dependencies
import EphemeralMap from "../src/index";

describe("EphemeralMap", () => {
  describe("constructor", () => {
    it("should be instanceof Map", () => {
      const em = new EphemeralMap();

      assert.ok(em instanceof Map);
    });

    it("should create a new EphemeralMap instance with an iterable", () => {
      const em = new EphemeralMap([
        ["foo", "bar"]
      ]);

      assert.deepEqual([...em.keys()], ["foo"]);
    });
  });

  describe("ttl", () => {
    it("should return zero if no ttl is provided in constructor options", () => {
      const em = new EphemeralMap();

      assert.strictEqual(em.ttl, 0);
    });
  });
});
