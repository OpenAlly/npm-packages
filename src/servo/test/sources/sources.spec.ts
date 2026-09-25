// Import Node.js Dependencies
import assert from "node:assert";
import fs from "node:fs/promises";
import { describe, it } from "node:test";
import { text } from "node:stream/consumers";
import type { Readable } from "node:stream";

// Import Internal Dependencies
import { bytesSource, FileSystemSource, type ServoEntry } from "../../src/index.ts";
import { strongEtag } from "../../src/http/etag.ts";
import { createWww, kDigits } from "../helpers/www.ts";

describe("FileSystemSource", () => {
  it("should find a file with its size and mtime", async() => {
    await using www = await createWww();
    const source = new FileSystemSource(www.root);

    await using entry = await source.lookup("digits.txt") as ServoEntry;
    const stats = await fs.stat(www.resolve("digits.txt"));

    assert.strictEqual(entry.size, 1000);
    assert.strictEqual(entry.mtime?.getTime(), stats.mtime.getTime());
  });

  it("should stream the whole file or a range", async() => {
    await using www = await createWww();
    const source = new FileSystemSource(www.root);

    const full = await source.lookup("digits.txt") as ServoEntry;
    assert.strictEqual(await text(await full.body() as Readable), kDigits);

    const part = await source.lookup("digits.txt") as ServoEntry;
    assert.strictEqual(await text(await part.body({ start: 10, end: 14 }) as Readable), "01234");
  });

  it("should make disposal a no-op once the body is taken, and idempotent", async() => {
    await using www = await createWww();
    const source = new FileSystemSource(www.root);

    const entry = await source.lookup("digits.txt") as ServoEntry;
    await entry[Symbol.asyncDispose]();
    await entry[Symbol.asyncDispose]();

    const streamed = await source.lookup("digits.txt") as ServoEntry;
    const body = await streamed.body() as Readable;
    await streamed[Symbol.asyncDispose]();
    assert.strictEqual(await text(body), kDigits);
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
