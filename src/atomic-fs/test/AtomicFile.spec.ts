// Import Node.js Dependencies
import assert from "node:assert";
import path from "node:path";
import { describe, it } from "node:test";

// Import Internal Dependencies
import { AtomicFile, defaultTemporaryNaming, temporaryNaming } from "../src/index.ts";
import { tempWorkspace } from "./helpers/tempWorkspace.ts";

describe("AtomicFile", () => {
  it("should expose the default naming strategy", () => {
    const atomic = new AtomicFile();

    assert.strictEqual(atomic.naming, defaultTemporaryNaming);
  });

  it("should apply its bound options to every write", async() => {
    await using workspace = await tempWorkspace();
    const atomic = new AtomicFile({ mkdir: true });

    await atomic.write(workspace.resolve("a/b/note.txt"), "ok");

    assert.strictEqual(await workspace.read("a/b/note.txt"), "ok");
  });

  it("should let a call override a bound option", async() => {
    await using workspace = await tempWorkspace();
    const atomic = new AtomicFile({ mkdir: true });

    await assert.rejects(
      () => atomic.write(workspace.resolve("a/b/note.txt"), "ok", { mkdir: false }),
      { code: "ENOENT" }
    );
  });

  it("should share the naming strategy between write and isTemporary", async() => {
    await using workspace = await tempWorkspace();
    const atomic = new AtomicFile({
      naming: temporaryNaming({ prefix: "~", suffix: ".partial" })
    });
    const seen: string[] = [];

    await atomic.write(workspace.resolve("note.txt"), "ok", {
      tmpfileCreated: (tmpfile) => void seen.push(tmpfile)
    });

    assert.ok(atomic.isTemporary(path.basename(seen[0])));
    assert.strictEqual(atomic.isTemporary("note.txt"), false);
  });

  it("should accept naming options instead of a built strategy", async() => {
    await using workspace = await tempWorkspace();
    const atomic = new AtomicFile({
      naming: { prefix: "~", suffix: ".partial" }
    });
    const seen: string[] = [];

    await atomic.write(workspace.resolve("note.txt"), "ok", {
      tmpfileCreated: (tmpfile) => void seen.push(tmpfile)
    });

    const tmpfile = path.basename(seen[0]);

    assert.ok(tmpfile.startsWith("~note.txt."));
    assert.ok(tmpfile.endsWith(".partial"));
    assert.ok(atomic.isTemporary(tmpfile));
  });

  it("should keep isTemporary usable once detached from the instance", () => {
    const atomic = new AtomicFile();
    const { isTemporary } = atomic;
    const tmpfile = path.basename(atomic.naming.create("/tmp/note.txt"));

    assert.ok(isTemporary(tmpfile));
  });

  it("should forward writeIfAbsent", async() => {
    await using workspace = await tempWorkspace();
    const atomic = new AtomicFile({ mkdir: true });
    const target = workspace.resolve("nested/note.txt");

    assert.strictEqual(await atomic.writeIfAbsent(target, "first"), true);
    assert.strictEqual(await atomic.writeIfAbsent(target, "second"), false);
    assert.strictEqual(await workspace.read("nested/note.txt"), "first");
  });

  it("should forward rename", async() => {
    await using workspace = await tempWorkspace();
    const atomic = new AtomicFile({ mkdir: true });
    const source = await workspace.write("from.txt", "payload");

    const moved = await atomic.rename(source, workspace.resolve("a/b/to.txt"));

    assert.strictEqual(moved, true);
    assert.strictEqual(await workspace.read("a/b/to.txt"), "payload");
  });

  it("should carry a bound overwrite policy into rename", async() => {
    await using workspace = await tempWorkspace();
    const atomic = new AtomicFile({ overwrite: false });
    const source = await workspace.write("from.txt", "next");
    await workspace.write("to.txt", "previous");

    const moved = await atomic.rename(source, workspace.resolve("to.txt"));

    assert.strictEqual(moved, false);
    assert.strictEqual(await workspace.read("to.txt"), "previous");
  });

  it("should not let a later mutation of the options object leak in", async() => {
    await using workspace = await tempWorkspace();
    const options = { mkdir: true };
    const atomic = new AtomicFile(options);
    options.mkdir = false;

    await atomic.write(workspace.resolve("a/note.txt"), "ok");

    assert.strictEqual(await workspace.read("a/note.txt"), "ok");
  });
});
