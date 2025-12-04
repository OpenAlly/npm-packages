// Import Node.js Dependencies
import { describe, it, test } from "node:test";
import assert from "node:assert/strict";

// Import Internal Dependencies
import autoURL, {
  autoURL as autoURLBis,
  type autoURLTransformConfig
} from "../src/index.ts";

// CONSTANTS
const kDummyURL = new URL("https://google.fr");

describe("autoURL", () => {
  test("should be a function", () => {
    assert.ok(typeof autoURL === "function");
    assert.ok(typeof autoURLBis === "function");
  });

  test("should export the same function as default & unit", () => {
    assert.ok(autoURL === autoURLBis);
  });

  test("should return no parameters if payload is not defined", () => {
    const url = autoURL(kDummyURL);

    assert.strictEqual(url.searchParams.size, 0);
  });

  test("should throw a runtime Error if source is not defined (null or undefined)", () => {
    assert.throws(
      () => autoURL(undefined as any),
      {
        name: "Error",
        message: "source argument must be provided"
      }
    );
  });

  describe("non iterable payload", () => {
    it("should generate a new URL with one argument", () => {
      const url = autoURL(kDummyURL, {
        foo: "bar"
      });

      assert.ok(url !== kDummyURL);
      assert.strictEqual(url.href, "https://google.fr/?foo=bar");

      assert.strictEqual(url.searchParams.size, 1);
      assert.strictEqual(url.searchParams.get("foo"), "bar");
    });

    it("should generate a new URL with multiple arguments", () => {
      const url = autoURL(kDummyURL, {
        aaa: 5,
        bbb: [1, 2, 3]
      });

      assert.strictEqual(url.searchParams.size, 2);
      assert.strictEqual(url.searchParams.get("aaa"), "5");
      assert.strictEqual(url.searchParams.get("bbb"), "[1,2,3]");
    });
  });

  describe("iterable payload", () => {
    it("should generate a new URL with an Array of pair", () => {
      const url = autoURL(kDummyURL, [
        ["foo", "bar"]
      ]);

      assert.strictEqual(url.searchParams.size, 1);
      assert.strictEqual(url.searchParams.get("foo"), "bar");
    });

    it("should generate a new URL with a Map", () => {
      const url = autoURL(
        kDummyURL,
        new Map([["foo", "bar"]])
      );

      assert.strictEqual(url.searchParams.size, 1);
      assert.strictEqual(url.searchParams.get("foo"), "bar");
    });
  });

  describe("transformers", () => {
    it("should use an UpperCase transformer", () => {
      const upperCaseTransformerConfig: autoURLTransformConfig<"foo"> = {
        foo: (value) => value.toUpperCase()
      };

      const url = autoURL(kDummyURL, {
        foo: "bar"
      }, upperCaseTransformerConfig);
      assert.strictEqual(url.searchParams.get("foo"), "BAR");
    });
  });
});
