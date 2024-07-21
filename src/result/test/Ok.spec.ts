// Import Node.js Dependencies
import { describe, test } from "node:test";
import assert from "node:assert/strict";

// Import Internal Dependencies
import { Ok, Err, Result } from "../src/index.js";

describe("Ok", () => {
  test("constructor", () => {
    const result = Ok(1);

    assert.ok(Result.isResult(result));
    assert.ok(result.ok);
    assert.strictEqual(result.err, false);
    assert.strictEqual(result.val, 1);
  });

  test("unwrap, unwrapOr, unwrapOrElse, safeUnwrap", () => {
    assert.strictEqual(Ok(1).unwrap(), 1);
    assert.strictEqual(Ok(1).safeUnwrap(), 1);
    assert.strictEqual(Ok(1).unwrapOr(5), 1);
    assert.strictEqual(Ok(1).unwrapOrElse(() => 5), 1);
  });

  test("map, mapErr", () => {
    assert.strictEqual(
      Ok(1).map((v) => v + 1).unwrap(),
      2
    );
    assert.strictEqual(
      Ok(1).mapErr(() => Err("oops")).unwrap(),
      1
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
    assert.strictEqual(
      Ok(1).andThen((v) => Ok(v + 1)).unwrap(),
      2
    );

    const result = Ok(1).andThen(() => Err("oops"));

    assert.strictEqual(result.ok, false);
    assert.ok(result.err);
  });
});
