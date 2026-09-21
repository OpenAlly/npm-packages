// Import Node.js Dependencies
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";

// Import Internal Dependencies
import { defaultTemporaryNaming, temporaryNaming, writeFileAtomic } from "../../src/index.ts";
import { always, failTimes, fsStub } from "../helpers/fsStub.ts";
import { exists, tempWorkspace } from "../helpers/tempWorkspace.ts";

describe("writeFileAtomic", () => {
  describe("payload", () => {
    it("should write a string with the default encoding", async() => {
      await using workspace = await tempWorkspace();
      const target = workspace.resolve("note.txt");

      await writeFileAtomic(target, "héllo");

      assert.strictEqual(await workspace.read("note.txt"), "héllo");
    });

    it("should honour an explicit encoding", async() => {
      await using workspace = await tempWorkspace();
      const target = workspace.resolve("note.txt");

      await writeFileAtomic(target, "6869", { encoding: "hex" });

      assert.strictEqual(await workspace.read("note.txt"), "hi");
    });

    it("should write a Uint8Array byte for byte", async() => {
      await using workspace = await tempWorkspace();
      const target = workspace.resolve("bytes.bin");

      await writeFileAtomic(target, new Uint8Array([0, 1, 2, 255]));

      assert.deepStrictEqual(
        [...await fs.readFile(target)],
        [0, 1, 2, 255]
      );
    });

    it("should respect the byteOffset of a view into a larger buffer", async() => {
      await using workspace = await tempWorkspace();
      const target = workspace.resolve("view.bin");
      const view = new Uint8Array([9, 9, 1, 2, 3, 9]).subarray(2, 5);

      await writeFileAtomic(target, view);

      assert.deepStrictEqual([...await fs.readFile(target)], [1, 2, 3]);
    });

    it("should write every byte of a non-octet typed array", async() => {
      await using workspace = await tempWorkspace();
      const target = workspace.resolve("floats.bin");

      await writeFileAtomic(target, new Float64Array([1.5, 2.5]));

      const written = await fs.readFile(target);
      assert.strictEqual(written.byteLength, 16);
      assert.deepStrictEqual(
        [...new Float64Array(
          written.buffer.slice(written.byteOffset, written.byteOffset + 16)
        )],
        [1.5, 2.5]
      );
    });

    it("should replace the content of an existing file", async() => {
      await using workspace = await tempWorkspace();
      const target = await workspace.write("note.txt", "a much longer previous content");

      await writeFileAtomic(target, "short");

      assert.strictEqual(await workspace.read("note.txt"), "short");
    });
  });

  describe("temporary file", () => {
    it("should leave nothing behind on success", async() => {
      await using workspace = await tempWorkspace();

      await writeFileAtomic(workspace.resolve("note.txt"), "ok");

      assert.deepStrictEqual(await workspace.entries(), ["note.txt"]);
    });

    it("should create the temporary file as a sibling of the target", async() => {
      await using workspace = await tempWorkspace();
      const seen: string[] = [];

      await writeFileAtomic(workspace.resolve("nested/note.txt"), "ok", {
        mkdir: true,
        tmpfileCreated: (tmpfile) => void seen.push(tmpfile)
      });

      assert.strictEqual(
        path.dirname(seen[0]),
        workspace.resolve("nested")
      );
    });

    it("should await tmpfileCreated before writing anything", async() => {
      await using workspace = await tempWorkspace();
      let sizeAtHook = -1;

      await writeFileAtomic(workspace.resolve("note.txt"), "content", {
        async tmpfileCreated(tmpfile) {
          const stats = await fs.stat(tmpfile);
          sizeAtHook = stats.size;
        }
      });

      assert.strictEqual(sizeAtHook, 0);
    });

    it("should use the provided naming strategy", async() => {
      await using workspace = await tempWorkspace();
      const naming = temporaryNaming({ prefix: "~", suffix: ".partial" });
      const seen: string[] = [];

      await writeFileAtomic(workspace.resolve("note.txt"), "ok", {
        naming,
        tmpfileCreated: (tmpfile) => void seen.push(tmpfile)
      });

      assert.ok(naming.match(path.basename(seen[0])));
    });

    it("should build a naming strategy from plain options", async() => {
      await using workspace = await tempWorkspace();
      const seen: string[] = [];

      await writeFileAtomic(workspace.resolve("note.txt"), "ok", {
        naming: { prefix: "~", suffix: ".partial" },
        tmpfileCreated: (tmpfile) => void seen.push(tmpfile)
      });

      const tmpfile = path.basename(seen[0]);

      assert.ok(tmpfile.startsWith("~note.txt."));
      assert.ok(tmpfile.endsWith(".partial"));
      assert.strictEqual(await workspace.read("note.txt"), "ok");
    });

    it("should remove the temporary file when the write fails", async() => {
      await using workspace = await tempWorkspace();

      await assert.rejects(
        () => writeFileAtomic(workspace.resolve("note.txt"), "ok", {
          tmpfileCreated: () => {
            throw new Error("boom");
          }
        }),
        /boom/
      );

      assert.deepStrictEqual(await workspace.entries(), []);
    });

    it("should remove the temporary file when the rename fails", async() => {
      await using workspace = await tempWorkspace();
      const target = await workspace.write("note.txt", "previous");

      await assert.rejects(
        () => writeFileAtomic(target, "next", {
          retry: false,
          fs: fsStub({ rename: always("EIO") })
        }),
        /EIO/
      );

      assert.deepStrictEqual(await workspace.entries(), ["note.txt"]);
      assert.strictEqual(await workspace.read("note.txt"), "previous");
    });
  });

  describe("durability", () => {
    it("should fsync the temporary file by default", async() => {
      await using workspace = await tempWorkspace();
      let synced = 0;
      const stub = fsStub({
        open: async(path, flags, mode) => {
          const handle = await fs.open(path, flags, mode);

          return {
            writeFile: handle.writeFile.bind(handle),
            close: handle.close.bind(handle),
            sync: async() => {
              synced++;
              await handle.sync();
            }
          };
        }
      });

      await writeFileAtomic(workspace.resolve("note.txt"), "ok", { fs: stub });

      assert.strictEqual(synced, 1);
    });

    it("should skip the fsync when asked", async() => {
      await using workspace = await tempWorkspace();
      let synced = 0;
      const stub = fsStub({
        open: async(path, flags, mode) => {
          const handle = await fs.open(path, flags, mode);

          return {
            writeFile: handle.writeFile.bind(handle),
            close: handle.close.bind(handle),
            sync: async() => {
              synced++;
            }
          };
        }
      });

      await writeFileAtomic(workspace.resolve("note.txt"), "ok", {
        fsync: false,
        fs: stub
      });

      assert.strictEqual(synced, 0);
    });

    it("should fsync the parent directory when asked", async() => {
      await using workspace = await tempWorkspace();

      await writeFileAtomic(workspace.resolve("note.txt"), "ok", {
        fsyncDirectory: true
      });

      assert.strictEqual(await workspace.read("note.txt"), "ok");
    });
  });

  describe("directories", () => {
    it("should reject when the parent is missing and mkdir is off", async() => {
      await using workspace = await tempWorkspace();

      await assert.rejects(
        () => writeFileAtomic(workspace.resolve("nested/note.txt"), "ok"),
        { code: "ENOENT" }
      );
    });

    it("should create the parent tree when mkdir is on", async() => {
      await using workspace = await tempWorkspace();

      await writeFileAtomic(workspace.resolve("a/b/c/note.txt"), "ok", {
        mkdir: true
      });

      assert.strictEqual(await workspace.read("a/b/c/note.txt"), "ok");
    });
  });

  describe("permissions", { skip: process.platform === "win32" }, () => {
    it("should inherit the mode of the existing file", async() => {
      await using workspace = await tempWorkspace();
      const target = await workspace.write("note.txt", "previous");
      await fs.chmod(target, 0o741);

      await writeFileAtomic(target, "next");

      const stats = await fs.stat(target);
      assert.strictEqual(stats.mode & 0o777, 0o741);
    });

    it("should apply an explicit mode over the inherited one", async() => {
      await using workspace = await tempWorkspace();
      const target = await workspace.write("note.txt", "previous");
      await fs.chmod(target, 0o741);

      await writeFileAtomic(target, "next", { mode: 0o600 });

      const stats = await fs.stat(target);
      assert.strictEqual(stats.mode & 0o777, 0o600);
    });

    it("should tolerate a chown the process is not allowed to perform", async() => {
      await using workspace = await tempWorkspace();
      const target = workspace.resolve("note.txt");

      await writeFileAtomic(target, "ok", {
        chown: { uid: 0, gid: 0 },
        fs: fsStub({ chown: always("EPERM") })
      });

      assert.strictEqual(await workspace.read("note.txt"), "ok");
    });

    it("should rethrow a chown failure that is not tolerable", async() => {
      await using workspace = await tempWorkspace();

      await assert.rejects(
        () => writeFileAtomic(workspace.resolve("note.txt"), "ok", {
          chown: { uid: 0, gid: 0 },
          fs: fsStub({ chown: always("EIO") })
        }),
        /EIO/
      );
    });

    it("should never chown when the option is false", async() => {
      await using workspace = await tempWorkspace();
      const target = await workspace.write("note.txt", "previous");
      const stub = fsStub({ chown: always("EIO") });

      await writeFileAtomic(target, "next", { chown: false, fs: stub });

      assert.ok(!stub.calls.includes("chown"));
    });
  });

  describe("symlinks", { skip: process.platform === "win32" }, () => {
    it("should write through the link instead of replacing it", async() => {
      await using workspace = await tempWorkspace();
      const real = await workspace.write("real.txt", "previous");
      const link = workspace.resolve("link.txt");
      await fs.symlink(real, link);

      await writeFileAtomic(link, "next");

      assert.strictEqual((await fs.lstat(link)).isSymbolicLink(), true);
      assert.strictEqual(await workspace.read("real.txt"), "next");
    });
  });

  describe("concurrency", () => {
    it("should serialize writes to the same target", async() => {
      await using workspace = await tempWorkspace();
      const target = workspace.resolve("note.txt");

      await Promise.all(
        Array.from({ length: 20 }, (_, index) => writeFileAtomic(
          target,
          `payload-${index}`.repeat(200)
        ))
      );

      const written = await workspace.read("note.txt");
      assert.match(written, /^(payload-\d+)+$/);
      assert.deepStrictEqual(await workspace.entries(), ["note.txt"]);
    });

    it("should never expose a partial file to a concurrent reader", async() => {
      await using workspace = await tempWorkspace();
      const target = await workspace.write("note.txt", "x".repeat(64_000));
      const lengths = new Set<number>();

      let settled = false;
      const writes = Promise.all(
        Array.from({ length: 10 }, (_, index) => writeFileAtomic(
          target,
          String(index % 2 === 0 ? "a" : "b").repeat(64_000),
          { retry: { attempts: 40, delay: 5, factor: 1 } }
        ))
      ).finally(() => {
        settled = true;
      });

      for (;;) {
        const content = await fs.readFile(target, "utf8").catch(() => null);
        if (content !== null) {
          lengths.add(content.length);
        }
        if (settled) {
          break;
        }

        await sleep(5);
      }

      await writes;
      assert.deepStrictEqual([...lengths], [64_000]);
    });
  });

  describe("abort", () => {
    it("should reject before touching the filesystem", async() => {
      await using workspace = await tempWorkspace();

      await assert.rejects(
        () => writeFileAtomic(workspace.resolve("note.txt"), "ok", {
          signal: AbortSignal.abort()
        }),
        { name: "AbortError" }
      );

      assert.deepStrictEqual(await workspace.entries(), []);
    });

    it("should leave no temporary file when aborted mid-write", async() => {
      await using workspace = await tempWorkspace();
      const controller = new AbortController();

      await assert.rejects(
        () => writeFileAtomic(workspace.resolve("note.txt"), "ok", {
          signal: controller.signal,
          tmpfileCreated: () => controller.abort()
        }),
        { name: "AbortError" }
      );

      assert.deepStrictEqual(await workspace.entries(), []);
    });
  });

  describe("retry", () => {
    it("should retry a transient rename failure", async() => {
      await using workspace = await tempWorkspace();
      const target = workspace.resolve("note.txt");

      await writeFileAtomic(target, "ok", {
        retry: { attempts: 4, delay: 1, factor: 1 },
        fs: fsStub({ rename: failTimes("EBUSY", 2, fs.rename) })
      });

      assert.strictEqual(await workspace.read("note.txt"), "ok");
    });

    it("should give up once the attempts are exhausted", async() => {
      await using workspace = await tempWorkspace();

      await assert.rejects(
        () => writeFileAtomic(workspace.resolve("note.txt"), "ok", {
          retry: { attempts: 2, delay: 1, factor: 1 },
          fs: fsStub({ rename: always("EBUSY") })
        }),
        { code: "EBUSY" }
      );

      assert.deepStrictEqual(await workspace.entries(), []);
    });

    it("should not retry a failure that will not resolve itself", async() => {
      await using workspace = await tempWorkspace();
      const stub = fsStub({ rename: always("EIO") });

      await assert.rejects(
        () => writeFileAtomic(workspace.resolve("note.txt"), "ok", {
          retry: { attempts: 5, delay: 1, factor: 1 },
          fs: stub
        }),
        { code: "EIO" }
      );

      assert.strictEqual(
        stub.calls.filter((call) => call === "rename").length,
        1
      );
    });
  });

  describe("cleanupOnExit", () => {
    it("should not leave a temporary file tracked after a successful write", async() => {
      await using workspace = await tempWorkspace();
      const { tracked } = await import("../../src/internal/temporary.ts");

      await writeFileAtomic(workspace.resolve("note.txt"), "ok");

      assert.deepStrictEqual(
        tracked().filter((file) => file.startsWith(workspace.root)),
        []
      );
    });

    it("should not track anything when disabled", async() => {
      await using workspace = await tempWorkspace();
      const { tracked } = await import("../../src/internal/temporary.ts");
      let duringWrite: readonly string[] = [];

      await writeFileAtomic(workspace.resolve("note.txt"), "ok", {
        cleanupOnExit: false,
        tmpfileCreated: () => {
          duringWrite = tracked();
        }
      });

      assert.deepStrictEqual(
        duringWrite.filter((file) => file.startsWith(workspace.root)),
        []
      );
    });

    it("should track the temporary file while the write is in flight", async() => {
      await using workspace = await tempWorkspace();
      const { tracked } = await import("../../src/internal/temporary.ts");
      let duringWrite: readonly string[] = [];

      await writeFileAtomic(workspace.resolve("note.txt"), "ok", {
        tmpfileCreated: () => {
          duringWrite = tracked();
        }
      });

      assert.strictEqual(
        duringWrite.filter((file) => file.startsWith(workspace.root)).length,
        1
      );
    });
  });

  describe("naming defaults", () => {
    it("should fall back to the default strategy", async() => {
      await using workspace = await tempWorkspace();
      const seen: string[] = [];

      await writeFileAtomic(workspace.resolve("note.txt"), "ok", {
        tmpfileCreated: (tmpfile) => void seen.push(tmpfile)
      });

      assert.ok(defaultTemporaryNaming.match(path.basename(seen[0])));
      assert.strictEqual(await exists(seen[0]), false);
    });
  });
});
