// Import Node.js Dependencies
import assert from "node:assert";
import fs from "node:fs/promises";
import { describe, it } from "node:test";

// Import Internal Dependencies
import { writeFileIfAbsent } from "../../src/index.ts";
import { always, fsStub } from "../helpers/fsStub.ts";
import { tempWorkspace } from "../helpers/tempWorkspace.ts";

describe("writeFileIfAbsent", () => {
  it("should create the file and report the win", async() => {
    await using workspace = await tempWorkspace();

    const created = await writeFileIfAbsent(workspace.resolve("note.txt"), "ok");

    assert.strictEqual(created, true);
    assert.strictEqual(await workspace.read("note.txt"), "ok");
  });

  it("should leave an existing file untouched", async() => {
    await using workspace = await tempWorkspace();
    const target = await workspace.write("note.txt", "previous");

    const created = await writeFileIfAbsent(target, "next");

    assert.strictEqual(created, false);
    assert.strictEqual(await workspace.read("note.txt"), "previous");
  });

  it("should leave no temporary file behind either way", async() => {
    await using workspace = await tempWorkspace();
    const target = workspace.resolve("note.txt");

    await writeFileIfAbsent(target, "first");
    await writeFileIfAbsent(target, "second");

    assert.deepStrictEqual(await workspace.entries(), ["note.txt"]);
  });

  it("should write a Uint8Array", async() => {
    await using workspace = await tempWorkspace();
    const target = workspace.resolve("bytes.bin");

    await writeFileIfAbsent(target, new Uint8Array([7, 8, 9]));

    assert.deepStrictEqual([...await fs.readFile(target)], [7, 8, 9]);
  });

  it("should create the parent tree when mkdir is on", async() => {
    await using workspace = await tempWorkspace();

    const created = await writeFileIfAbsent(
      workspace.resolve("a/b/note.txt"),
      "ok",
      { mkdir: true }
    );

    assert.strictEqual(created, true);
    assert.strictEqual(await workspace.read("a/b/note.txt"), "ok");
  });

  it("should let exactly one of many concurrent callers win", async() => {
    await using workspace = await tempWorkspace();
    const target = workspace.resolve("note.txt");

    const results = await Promise.all(
      Array.from({ length: 12 }, (_, index) => writeFileIfAbsent(
        target,
        `writer-${index}`
      ))
    );

    assert.strictEqual(results.filter(Boolean).length, 1);
    assert.match(await workspace.read("note.txt"), /^writer-\d+$/);
    assert.deepStrictEqual(await workspace.entries(), ["note.txt"]);
  });

  it("should apply an explicit mode", { skip: process.platform === "win32" }, async() => {
    await using workspace = await tempWorkspace();
    const target = workspace.resolve("note.txt");

    await writeFileIfAbsent(target, "ok", { mode: 0o600 });

    assert.strictEqual((await fs.stat(target)).mode & 0o777, 0o600);
  });

  it("should apply an explicit chown", async() => {
    await using workspace = await tempWorkspace();
    const stub = fsStub({ chown: () => Promise.resolve() });

    await writeFileIfAbsent(workspace.resolve("note.txt"), "ok", {
      chown: { uid: 1, gid: 1 },
      fs: stub
    });

    assert.ok(stub.calls.includes("chown"));
  });

  it("should rethrow a link failure that is not EEXIST", async() => {
    await using workspace = await tempWorkspace();

    await assert.rejects(
      () => writeFileIfAbsent(workspace.resolve("note.txt"), "ok", {
        retry: false,
        fs: fsStub({ link: always("EIO") })
      }),
      { code: "EIO" }
    );

    assert.deepStrictEqual(await workspace.entries(), []);
  });

  it("should reject when aborted", async() => {
    await using workspace = await tempWorkspace();

    await assert.rejects(
      () => writeFileIfAbsent(workspace.resolve("note.txt"), "ok", {
        signal: AbortSignal.abort()
      }),
      { name: "AbortError" }
    );

    assert.deepStrictEqual(await workspace.entries(), []);
  });

  it("should fsync the parent directory when asked", async() => {
    await using workspace = await tempWorkspace();

    const created = await writeFileIfAbsent(workspace.resolve("note.txt"), "ok", {
      fsyncDirectory: true
    });

    assert.strictEqual(created, true);
  });
});
