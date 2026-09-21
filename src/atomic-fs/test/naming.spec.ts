// Import Node.js Dependencies
import assert from "node:assert";
import path from "node:path";
import { describe, it } from "node:test";

// Import Internal Dependencies
import { defaultTemporaryNaming, temporaryNaming } from "../src/index.ts";
import { resolveTemporaryNaming } from "../src/naming.ts";

const kTarget = path.resolve("/workspace/assets/sprite.png");

describe("temporaryNaming", () => {
  describe("create", () => {
    it("should place the temporary file next to the target", () => {
      const tmpfile = defaultTemporaryNaming.create(kTarget);

      assert.strictEqual(path.dirname(tmpfile), path.dirname(kTarget));
    });

    it("should keep the target basename so a stray file stays traceable", () => {
      const tmpfile = path.basename(defaultTemporaryNaming.create(kTarget));

      assert.ok(tmpfile.includes("sprite.png"));
    });

    it("should never collide across calls", () => {
      const names = new Set(
        Array.from({ length: 1_000 }, () => defaultTemporaryNaming.create(kTarget))
      );

      assert.strictEqual(names.size, 1_000);
    });

    it("should resolve a relative target against the current directory", () => {
      const tmpfile = defaultTemporaryNaming.create("sprite.png");

      assert.strictEqual(path.dirname(tmpfile), path.resolve("."));
    });
  });

  describe("match", () => {
    it("should recognize what create produced", () => {
      const tmpfile = defaultTemporaryNaming.create(kTarget);

      assert.ok(defaultTemporaryNaming.match(path.basename(tmpfile)));
    });

    it("should reject the target itself", () => {
      assert.strictEqual(defaultTemporaryNaming.match("sprite.png"), false);
    });

    it("should reject a user file that merely looks temporary", () => {
      for (const name of [".notes.tmp", "build.tmp", ".tmp", ".a.zzz.tmp"]) {
        assert.strictEqual(
          defaultTemporaryNaming.match(name),
          false,
          `${name} should not be treated as an artifact`
        );
      }
    });
  });

  describe("options", () => {
    it("should round-trip a custom prefix and suffix", () => {
      const naming = temporaryNaming({ prefix: "~", suffix: ".partial" });
      const tmpfile = path.basename(naming.create(kTarget));

      assert.ok(tmpfile.startsWith("~sprite.png."));
      assert.ok(tmpfile.endsWith(".partial"));
      assert.ok(naming.match(tmpfile));
    });

    it("should not match artifacts from another strategy", () => {
      const naming = temporaryNaming({ prefix: "~", suffix: ".partial" });
      const foreign = path.basename(defaultTemporaryNaming.create(kTarget));

      assert.strictEqual(naming.match(foreign), false);
    });

    it("should use the injected token factory", () => {
      const naming = temporaryNaming({ random: () => "abc123abc123" });
      const tmpfile = path.basename(naming.create(kTarget));

      assert.strictEqual(tmpfile, ".sprite.png.abc123abc123.tmp");
      assert.ok(naming.match(tmpfile));
    });

    it("should refuse a token match would not recognize", () => {
      const naming = temporaryNaming({ random: () => "token-1" });

      assert.throws(
        () => naming.create(kTarget),
        /12 lowercase hexadecimal characters/
      );
    });

    it("should only match a token of the configured entropy", () => {
      assert.strictEqual(defaultTemporaryNaming.match(".cache.db.tmp"), false);
      assert.strictEqual(
        temporaryNaming({ entropy: 1 }).match(".cache.db.tmp"),
        true
      );
    });

    it("should honour the entropy option", () => {
      const naming = temporaryNaming({ entropy: 16 });
      const matched = /\.([0-9a-f]+)\.tmp$/.exec(
        path.basename(naming.create(kTarget))
      );

      assert.ok(matched, "the generated name should carry a token");
      const [, token] = matched;

      assert.strictEqual(token.length, 32);
    });

    it("should refuse a strategy that cannot be matched back", () => {
      assert.throws(
        () => temporaryNaming({ prefix: "", suffix: "" }),
        /non-empty prefix or suffix/
      );
    });
  });
});

describe("resolveTemporaryNaming", () => {
  it("should fall back to the default strategy", () => {
    assert.strictEqual(resolveTemporaryNaming(), defaultTemporaryNaming);
    assert.strictEqual(resolveTemporaryNaming(undefined), defaultTemporaryNaming);
  });

  it("should hand back a strategy untouched", () => {
    const naming = temporaryNaming({ prefix: "~", suffix: ".partial" });

    assert.strictEqual(resolveTemporaryNaming(naming), naming);
  });

  it("should build a strategy from options", () => {
    const naming = resolveTemporaryNaming({ prefix: "~", suffix: ".partial" });
    const tmpfile = path.basename(naming.create(kTarget));

    assert.ok(tmpfile.startsWith("~sprite.png."));
    assert.ok(tmpfile.endsWith(".partial"));
    assert.ok(naming.match(tmpfile));
  });

  it("should treat empty options as the defaults", () => {
    const naming = resolveTemporaryNaming({});

    assert.ok(naming.match(path.basename(defaultTemporaryNaming.create(kTarget))));
  });

  it("should replace rather than merge with the defaults", () => {
    const naming = resolveTemporaryNaming({ prefix: "~" });
    const tmpfile = path.basename(naming.create(kTarget));

    assert.ok(tmpfile.endsWith(".tmp"));
    assert.strictEqual(defaultTemporaryNaming.match(tmpfile), false);
  });

  it("should refuse options that cannot be matched back", () => {
    assert.throws(
      () => resolveTemporaryNaming({ prefix: "", suffix: "" }),
      /non-empty prefix or suffix/
    );
  });
});
