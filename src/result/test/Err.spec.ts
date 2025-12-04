// Import Node.js Dependencies
import { describe, test } from "node:test";
import assert from "node:assert/strict";

// Import Internal Dependencies
import {
  Ok,
  Err,
  isResult
} from "../src/index.ts";

describe("Err", () => {
  test("constructor", () => {
    const result = Err("oops");

    assert.ok(isResult(result));
    assert.strictEqual(result.ok, false);
    assert.ok(result.err);
    assert.strictEqual(result.val, "oops");

    assert.ok(typeof result.stack === "string");
  });

  test("unwrap", () => {
    assert.throws(
      () => Err(new Error("oops")).unwrap(),
      { message: "oops" }
    );

    assert.throws(
      () => Err(10).unwrap(),
      { message: /^Tried to unwrap Error: 10.*/g }
    );

    assert.throws(
      () => Err(new CustomError("oops")).unwrap(),
      { message: "oops" }
    );
  });

  test("unwrapOr, unwrapOrElse", () => {
    assert.strictEqual(Err("oops").unwrapOr(5), 5);
    assert.strictEqual(Err("oops").unwrapOrElse(() => 5), 5);
  });

  test("map, mapErr", () => {
    assert.strictEqual(
      Err(new Error("oops"))
        .mapOr(1, () => -1),
      1
    );

    assert.strictEqual(
      Err(new Error("oops"))
        .mapOrElse((error) => error.message, () => -1),
      "oops"
    );
  });

  test("mapOr, mapOrElse", () => {
    assert.strictEqual(
      Ok(11).mapOr(1, (val) => val * 2),
      22
    );
    assert.strictEqual(
      Ok(11).mapOrElse(
        (_error) => 1,
        (val) => val * 2
      ),
      22
    );
  });

  test("andThen", () => {
    assert.throws(
      () => Err(new Error("oops")).andThen(() => Ok(1)).unwrap(),
      { message: "oops" }
    );
  });
});

class CustomError extends Error {
  foo: string;

  constructor(message: string) {
    super(message);
    this.foo = "bar";
  }
}
