// Import Node.js Dependencies
import assert from "node:assert";
import path from "node:path";
import { describe, it } from "node:test";

// Import Internal Dependencies
import { containedPath } from "../../src/index.ts";
import { realPath } from "../../src/paths/containedPath.ts";
import { createWww } from "../helpers/www.ts";

describe("containedPath", () => {
  it("should resolve a file inside the root", async() => {
    await using www = await createWww();

    assert.strictEqual(await containedPath(www.root, "index.html"), www.resolve("index.html"));
  });

  it("should resolve the root itself", async() => {
    await using www = await createWww();

    assert.strictEqual(await containedPath(www.root, ""), www.root);
  });

  it("should resolve a missing leaf through its parent", async() => {
    await using www = await createWww();

    assert.strictEqual(
      await containedPath(www.root, "docs/missing/deep.txt"),
      www.resolve("docs", "missing", "deep.txt")
    );
  });

  it("should follow a link that stays inside the root", async() => {
    await using www = await createWww();

    assert.strictEqual(await containedPath(www.root, "alias/index.html"), www.resolve("docs", "index.html"));
  });

  it("should reject a link that leaves the root", async() => {
    await using www = await createWww();

    assert.strictEqual(await containedPath(www.root, "escape/secret.txt"), null);
    assert.strictEqual(await containedPath(www.root, "escape/missing.txt"), null);
  });

  it("should reject a lexical escape", async() => {
    await using www = await createWww();

    assert.strictEqual(await containedPath(www.root, "../package.json"), null);
    assert.strictEqual(await containedPath(www.root, ".."), null);
  });

  it("should resolve a path below a file", async() => {
    await using www = await createWww();

    assert.strictEqual(
      await containedPath(www.root, "index.html/x"),
      www.resolve("index.html", "x")
    );
  });
});

describe("realPath", () => {
  it("should rethrow errors other than a missing entry", async() => {
    await assert.rejects(
      () => realPath(path.join(process.cwd(), "a\u0000b")),
      (error: any) => error.code !== "ENOENT"
    );
  });
});
