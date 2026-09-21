// Import Node.js Dependencies
import assert from "node:assert";
import fs from "node:fs/promises";
import { describe, it } from "node:test";

// Import Internal Dependencies
import { renameFileAtomic } from "../../src/index.ts";
import { always, failTimes, fsStub } from "../helpers/fsStub.ts";
import { exists, tempWorkspace } from "../helpers/tempWorkspace.ts";

describe("renameFileAtomic", () => {
  describe("overwrite", () => {
    it("should move the file and report the move", async() => {
      await using workspace = await tempWorkspace();
      const source = await workspace.write("from.txt", "payload");

      const moved = await renameFileAtomic(source, workspace.resolve("to.txt"));

      assert.strictEqual(moved, true);
      assert.strictEqual(await workspace.read("to.txt"), "payload");
      assert.strictEqual(await exists(source), false);
    });

    it("should replace an existing destination", async() => {
      await using workspace = await tempWorkspace();
      const source = await workspace.write("from.txt", "next");
      await workspace.write("to.txt", "previous");

      const moved = await renameFileAtomic(source, workspace.resolve("to.txt"));

      assert.strictEqual(moved, true);
      assert.strictEqual(await workspace.read("to.txt"), "next");
      assert.deepStrictEqual(await workspace.entries(), ["to.txt"]);
    });

    it("should reject when the source is missing", async() => {
      await using workspace = await tempWorkspace();

      await assert.rejects(
        () => renameFileAtomic(
          workspace.resolve("missing.txt"),
          workspace.resolve("to.txt"),
          { retry: false }
        ),
        { code: "ENOENT" }
      );
    });

    it("should create the destination parent when mkdir is on", async() => {
      await using workspace = await tempWorkspace();
      const source = await workspace.write("from.txt", "payload");

      await renameFileAtomic(source, workspace.resolve("a/b/to.txt"), {
        mkdir: true
      });

      assert.strictEqual(await workspace.read("a/b/to.txt"), "payload");
    });
  });

  describe("overwrite: false", () => {
    it("should move the file when the destination is free", async() => {
      await using workspace = await tempWorkspace();
      const source = await workspace.write("from.txt", "payload");

      const moved = await renameFileAtomic(source, workspace.resolve("to.txt"), {
        overwrite: false
      });

      assert.strictEqual(moved, true);
      assert.strictEqual(await workspace.read("to.txt"), "payload");
      assert.strictEqual(await exists(source), false);
    });

    it("should decline and leave both paths untouched", async() => {
      await using workspace = await tempWorkspace();
      const source = await workspace.write("from.txt", "next");
      await workspace.write("to.txt", "previous");

      const moved = await renameFileAtomic(source, workspace.resolve("to.txt"), {
        overwrite: false
      });

      assert.strictEqual(moved, false);
      assert.strictEqual(await workspace.read("to.txt"), "previous");
      assert.strictEqual(await workspace.read("from.txt"), "next");
    });

    it("should let exactly one of many concurrent movers claim the destination", async() => {
      await using workspace = await tempWorkspace();
      const destination = workspace.resolve("to.txt");
      const sources = await Promise.all(
        Array.from({ length: 8 }, (_, index) => workspace.write(
          `from-${index}.txt`,
          `payload-${index}`
        ))
      );

      const results = await Promise.all(
        sources.map((source) => renameFileAtomic(source, destination, {
          overwrite: false
        }))
      );

      assert.strictEqual(results.filter(Boolean).length, 1);
      assert.match(await workspace.read("to.txt"), /^payload-\d+$/);
    });

    it("should rethrow a link failure that is neither EEXIST nor EXDEV", async() => {
      await using workspace = await tempWorkspace();
      const source = await workspace.write("from.txt", "payload");

      await assert.rejects(
        () => renameFileAtomic(source, workspace.resolve("to.txt"), {
          overwrite: false,
          retry: false,
          fs: fsStub({ link: always("EIO") })
        }),
        { code: "EIO" }
      );

      assert.strictEqual(await workspace.read("from.txt"), "payload");
    });
  });

  describe("cross-device fallback", () => {
    it("should copy then unlink when rename reports EXDEV", async() => {
      await using workspace = await tempWorkspace();
      const source = await workspace.write("from.txt", "payload");
      const stub = fsStub({ rename: failTimes("EXDEV", 1, fs.rename) });

      const moved = await renameFileAtomic(source, workspace.resolve("to.txt"), {
        fs: stub
      });

      assert.strictEqual(moved, true);
      assert.strictEqual(await workspace.read("to.txt"), "payload");
      assert.strictEqual(await exists(source), false);
      assert.ok(stub.calls.includes("copyFile"));
      assert.deepStrictEqual(await workspace.entries(), ["to.txt"]);
    });

    it("should skip the copy fsync when asked", async() => {
      await using workspace = await tempWorkspace();
      const source = await workspace.write("from.txt", "payload");
      const stub = fsStub({ rename: failTimes("EXDEV", 1, fs.rename) });

      await renameFileAtomic(source, workspace.resolve("to.txt"), {
        fsync: false,
        fs: stub
      });

      assert.strictEqual(stub.calls.filter((call) => call === "open").length, 0);
    });

    it("should leave no temporary file when the copy fails", async() => {
      await using workspace = await tempWorkspace();
      const source = await workspace.write("from.txt", "payload");

      await assert.rejects(
        () => renameFileAtomic(source, workspace.resolve("to.txt"), {
          retry: false,
          fs: fsStub({
            rename: always("EXDEV"),
            copyFile: always("ENOSPC")
          })
        }),
        { code: "ENOSPC" }
      );

      assert.deepStrictEqual(await workspace.entries(), ["from.txt"]);
    });

    it("should link the copy into place when overwrite is off", async() => {
      await using workspace = await tempWorkspace();
      const source = await workspace.write("from.txt", "payload");
      const stub = fsStub({ link: failTimes("EXDEV", 1, fs.link) });

      const moved = await renameFileAtomic(source, workspace.resolve("to.txt"), {
        overwrite: false,
        retry: false,
        fs: stub
      });

      assert.strictEqual(moved, true);
      assert.strictEqual(await workspace.read("to.txt"), "payload");
      assert.strictEqual(await exists(source), false);
      assert.ok(stub.calls.includes("copyFile"));
      assert.deepStrictEqual(await workspace.entries(), ["to.txt"]);
    });

    it("should never expose a destination when the copy fails with overwrite off", async() => {
      await using workspace = await tempWorkspace();
      const source = await workspace.write("from.txt", "payload");

      await assert.rejects(
        () => renameFileAtomic(source, workspace.resolve("to.txt"), {
          overwrite: false,
          retry: false,
          fs: fsStub({ link: always("EXDEV"), copyFile: always("ENOSPC") })
        }),
        { code: "ENOSPC" }
      );

      assert.deepStrictEqual(await workspace.entries(), ["from.txt"]);
    });

    it("should decline when the destination is taken and link is unavailable", async() => {
      await using workspace = await tempWorkspace();
      const source = await workspace.write("from.txt", "next");
      await workspace.write("to.txt", "previous");

      const moved = await renameFileAtomic(source, workspace.resolve("to.txt"), {
        overwrite: false,
        retry: false,
        fs: fsStub({ link: failTimes("EXDEV", 1, fs.link) })
      });

      assert.strictEqual(moved, false);
      assert.strictEqual(await workspace.read("to.txt"), "previous");
      assert.strictEqual(await workspace.read("from.txt"), "next");
    });
  });

  describe("retry", () => {
    it("should retry a transient rename failure", async() => {
      await using workspace = await tempWorkspace();
      const source = await workspace.write("from.txt", "payload");

      const moved = await renameFileAtomic(source, workspace.resolve("to.txt"), {
        retry: { attempts: 4, delay: 1, factor: 1 },
        fs: fsStub({ rename: failTimes("EPERM", 2, fs.rename) })
      });

      assert.strictEqual(moved, true);
      assert.strictEqual(await workspace.read("to.txt"), "payload");
    });

    it("should give up once the attempts are exhausted", async() => {
      await using workspace = await tempWorkspace();
      const source = await workspace.write("from.txt", "payload");

      await assert.rejects(
        () => renameFileAtomic(source, workspace.resolve("to.txt"), {
          retry: { attempts: 2, delay: 1, factor: 1 },
          fs: fsStub({ rename: always("EBUSY") })
        }),
        { code: "EBUSY" }
      );
    });
  });

  describe("abort", () => {
    it("should reject before touching the filesystem", async() => {
      await using workspace = await tempWorkspace();
      const source = await workspace.write("from.txt", "payload");

      await assert.rejects(
        () => renameFileAtomic(source, workspace.resolve("to.txt"), {
          signal: AbortSignal.abort()
        }),
        { name: "AbortError" }
      );

      assert.deepStrictEqual(await workspace.entries(), ["from.txt"]);
    });
  });

  describe("symlinks", { skip: process.platform === "win32" }, () => {
    it("should move the file the source link points at", async() => {
      await using workspace = await tempWorkspace();
      const real = await workspace.write("real.txt", "payload");
      await fs.symlink(real, workspace.resolve("link.txt"));

      await renameFileAtomic(
        workspace.resolve("link.txt"),
        workspace.resolve("to.txt")
      );

      assert.strictEqual(await workspace.read("to.txt"), "payload");
      assert.strictEqual(await exists(real), false);
    });
  });
});
