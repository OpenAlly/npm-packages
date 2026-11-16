// Import Node.js Dependencies
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { Buffer } from "node:buffer";
import { buffer } from "node:stream/consumers";
import { Readable } from "node:stream";

// Import Internal Dependencies
import {
  bytesEntry,
  bytesSource,
  ContainedRoot,
  contentEtag,
  FileSystemSource,
  type EntryBody,
  type ServoEntry
} from "../../src/index.ts";
import { strongEtag } from "../../src/http/etag.ts";
import { isSameEntry } from "../../src/sources/containment.ts";
import { createWww, kDigits } from "../helpers/www.ts";

async function readBody(
  body: EntryBody
): Promise<string> {
  const bytes = body instanceof Readable ? await buffer(body) : body;

  return Buffer.from(bytes).toString("utf8");
}

describe("FileSystemSource", () => {
  it("should find a file with its size and mtime", async() => {
    await using www = await createWww();
    const source = new FileSystemSource(www.root);

    await using entry = await source.lookup("digits.txt") as ServoEntry;
    const stats = await fs.stat(www.resolve("digits.txt"));

    assert.strictEqual(entry.size, 1000);
    assert.strictEqual(entry.mtime?.getTime(), stats.mtime.getTime());
  });

  it("should read the whole file or a range", async() => {
    await using www = await createWww();
    const source = new FileSystemSource(www.root);

    const full = await source.lookup("digits.txt") as ServoEntry;
    assert.strictEqual(await readBody(await full.body()), kDigits);

    const part = await source.lookup("digits.txt") as ServoEntry;
    assert.strictEqual(await readBody(await part.body({ start: 10, end: 14 })), "01234");
  });

  it("should read small bodies in one call and stream large ones", async() => {
    await using www = await createWww();
    const large = "x".repeat((64 * 1024) + 1);
    await fs.writeFile(www.resolve("large.txt"), large);
    const source = new FileSystemSource(www.root);

    const small = await source.lookup("digits.txt") as ServoEntry;
    const smallBody = await small.body();
    assert.ok(smallBody instanceof Uint8Array);
    assert.strictEqual(await readBody(smallBody), kDigits);

    const big = await source.lookup("large.txt") as ServoEntry;
    const bigBody = await big.body();
    assert.ok(bigBody instanceof Readable);
    assert.strictEqual(await readBody(bigBody), large);

    // A small range of a large file is read in one call too.
    const slice = await source.lookup("large.txt") as ServoEntry;
    const sliceBody = await slice.body({ start: 100, end: 199 });
    assert.ok(sliceBody instanceof Uint8Array);
    assert.strictEqual(await readBody(sliceBody), "x".repeat(100));
  });

  it("should treat an escaping directory link like a miss", async() => {
    await using www = await createWww();
    const source = new FileSystemSource(www.root);

    assert.strictEqual(await source.lookup("escape"), null);
    assert.strictEqual(await source.lookup("alias"), "directory");
  });

  it("should make disposal a no-op once the body is taken, and idempotent", async() => {
    await using www = await createWww();
    const source = new FileSystemSource(www.root);

    const entry = await source.lookup("digits.txt") as ServoEntry;
    await entry[Symbol.asyncDispose]();
    await entry[Symbol.asyncDispose]();

    const streamed = await source.lookup("digits.txt") as ServoEntry;
    const body = await streamed.body();
    await streamed[Symbol.asyncDispose]();
    assert.strictEqual(await readBody(body), kDigits);
  });

  it("should report directories", async() => {
    await using www = await createWww();
    const source = new FileSystemSource(www.root);

    assert.strictEqual(await source.lookup(""), "directory");
    assert.strictEqual(await source.lookup("docs"), "directory");
  });

  it("should return null for missing paths", async() => {
    await using www = await createWww();
    const source = new FileSystemSource(www.root);

    assert.strictEqual(await source.lookup("missing.txt"), null);
    assert.strictEqual(await source.lookup("index.html/child"), null);
  });

  it("should return null for a link that leaves the root", async() => {
    await using www = await createWww();
    const source = new FileSystemSource(www.root);

    assert.strictEqual(await source.lookup("escape/secret.txt"), null);
  });

  it("should follow escaping links when allowed", async() => {
    await using www = await createWww();
    const source = new FileSystemSource(www.root, { followSymlinks: true });

    const entry = await source.lookup("escape/secret.txt") as ServoEntry;
    assert.strictEqual(entry.size, 6);
    await entry[Symbol.asyncDispose]();
  });

  it("should not leave the root lexically, even when following links", async() => {
    await using www = await createWww();

    for (const followSymlinks of [false, true]) {
      const source = new FileSystemSource(www.root, { followSymlinks });

      assert.strictEqual(await source.lookup("../package.json"), null);
      assert.strictEqual(await source.lookup("docs/../../outside/secret.txt"), null);
    }
  });

  it("should treat a name too long for the filesystem like a miss", async() => {
    await using www = await createWww();
    const source = new FileSystemSource(www.root);

    assert.strictEqual(await source.lookup("a".repeat(300)), null);
    assert.strictEqual(await source.lookup(`docs/${"a".repeat(300)}/index.html`), null);
  });

  it("should serve links that stay inside the root", async() => {
    await using www = await createWww();
    const source = new FileSystemSource(www.root);

    const entry = await source.lookup("alias/index.html") as ServoEntry;
    assert.strictEqual(entry.size, "<h1>docs</h1>".length);
    await entry[Symbol.asyncDispose]();
  });

  it("should return null for everything when the root is missing", async() => {
    await using www = await createWww();
    const source = new FileSystemSource(www.resolve("nope"));

    assert.strictEqual(await source.lookup("index.html"), null);
  });

  it("should resolve a relative root against the working directory", () => {
    const source = new FileSystemSource("dist");

    assert.strictEqual(source.root, `${process.cwd()}${process.platform === "win32" ? "\\" : "/"}dist`);
    assert.strictEqual(source.followSymlinks, false);
  });
});

describe("bytesSource", () => {
  const files = new Map([["a.txt", new TextEncoder().encode("hello world")]]);
  async function read(
    path: string
  ): Promise<Uint8Array | null> {
    return files.get(path) ?? null;
  }

  it("should return null for a missing path", async() => {
    assert.strictEqual(await bytesSource(read).lookup("b.txt"), null);
  });

  it("should expose the bytes and a range", async() => {
    await using entry = await bytesSource(read).lookup("a.txt") as ServoEntry;

    assert.strictEqual(entry.size, 11);
    assert.strictEqual(entry.etag, undefined);
    assert.strictEqual(entry.mtime, undefined);
    assert.strictEqual(new TextDecoder().decode(await entry.body() as Uint8Array), "hello world");
    const range = await entry.body({ start: 6, end: 10 }) as Uint8Array;
    assert.strictEqual(new TextDecoder().decode(range), "world");
  });

  it("should hash a strong etag from the content", async() => {
    const entry = await bytesSource(read, { etag: "content" }).lookup("a.txt") as ServoEntry;

    assert.strictEqual(entry.etag, strongEtag("hello world"));
  });
});

describe("contentEtag", () => {
  it("should hash a strong etag, the same for the same array", () => {
    const bytes = new TextEncoder().encode("hello world");

    assert.strictEqual(contentEtag(bytes), strongEtag("hello world"));
    assert.strictEqual(contentEtag(bytes), contentEtag(bytes));
  });
});

describe("bytesEntry", () => {
  it("should use a string etag as is and carry the mtime", async() => {
    const mtime = new Date(0);
    await using entry = bytesEntry(new Uint8Array(3), { etag: "\"v1\"", mtime });

    assert.strictEqual(entry.etag, "\"v1\"");
    assert.strictEqual(entry.mtime, mtime);
    assert.strictEqual(entry.size, 3);
  });

  it("should have no etag by default", () => {
    assert.strictEqual(bytesEntry(new Uint8Array(1)).etag, undefined);
  });
});

describe("ContainedRoot", () => {
  it("should resolve contained paths and reject escaping links", async() => {
    await using www = await createWww();
    const contained = new ContainedRoot(www.root);

    assert.strictEqual(await contained.resolve("docs/index.html"), www.resolve("docs", "index.html"));
    assert.strictEqual(await contained.resolve("missing/leaf.txt"), www.resolve("missing", "leaf.txt"));
    assert.strictEqual(await contained.resolve("escape/secret.txt"), null);
  });

  it("should pick up a root link retargeted after the first call", async() => {
    await using www = await createWww();
    const releases = [path.join(www.base, "release-1"), path.join(www.base, "release-2")];
    for (const release of releases) {
      await fs.mkdir(release);
      await fs.writeFile(path.join(release, "index.html"), release);
    }
    const current = path.join(www.base, "current");
    await fs.symlink(releases[0], current, "junction");
    const contained = new ContainedRoot(current);

    assert.strictEqual(await contained.resolve("index.html"), path.join(releases[0], "index.html"));

    await fs.rm(current);
    await fs.symlink(releases[1], current, "junction");

    assert.strictEqual(await contained.resolve("index.html"), path.join(releases[1], "index.html"));
    assert.strictEqual(await contained.resolve("../outside/secret.txt"), null);
  });
});

describe("isSameEntry", () => {
  it("should match the opened file and nothing else", async() => {
    await using www = await createWww();
    await using handle = await fs.open(www.resolve("digits.txt"));
    const opened = await handle.stat({ bigint: true });

    assert.strictEqual(await isSameEntry(www.resolve("digits.txt"), opened), true);
    assert.strictEqual(await isSameEntry(www.resolve("about.html"), opened), false);
    assert.strictEqual(await isSameEntry(www.resolve("missing.txt"), opened), false);
  });

  it("should not match a link swapped onto the checked path", async() => {
    await using www = await createWww();
    // What `open` sees through the `alias -> docs` link.
    const target = await fs.stat(www.resolve("alias"), { bigint: true });

    assert.strictEqual(await isSameEntry(www.resolve("docs"), target), true);
    assert.strictEqual(await isSameEntry(www.resolve("alias"), target), false);
  });
});
