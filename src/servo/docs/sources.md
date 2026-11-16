# Sources

A source maps a validated path to an entry. `servo()` and `send()` never read files themselves, so anything that can produce bytes can be served.

```ts
interface ServoSource {
  lookup(path: string): Promise<Lookup>;
}

type Lookup = ServoEntry | "directory" | null;
```

`path` has already been through [`safePath`](./paths.md#safepath): no leading or trailing slash, no `..`, and `""` for the root. `lookup` resolves `null` when nothing is there, and `"directory"` for a folder, which lets `servo()` redirect it or look for its index.

## ServoEntry

```ts
interface ServoEntry extends AsyncDisposable {
  size: number;
  mtime?: Date;
  etag?: string;
  body(range?: ByteRange): Readable | Uint8Array | Promise<Readable | Uint8Array>;
  [Symbol.asyncDispose](): PromiseLike<void>;
}
```

- `size` is the byte length, and ranges are checked against it.
- `mtime` drives `Last-Modified` and the default weak ETag. Without it and without `etag`, no ETag is sent.
- `etag` replaces the computed ETag. Only a strong tag (no `W/`) lets `If-Range` requests get a 206.
- `body(range)` returns the bytes, or only `range` (inclusive) when one is given. It is called at most once, and only for a GET that sends a body.
- `[Symbol.asyncDispose]()` releases what `lookup` acquired. `send()` awaits it once after the response, even if `body()` was never called. Returned streams have ended or been destroyed by then. It also lets callers use `await using entry = ...` for direct lookups. Entries without resources can provide a no-op method.

## FileSystemSource

```ts
new FileSystemSource(root: string, options?: { followSymlinks?: boolean })
```

Serves a folder of the local filesystem. `root` is resolved against the working directory.

Each lookup opens the file with `fs.promises.open` and reads its size and mtime from `handle.stat()`, so the headers describe the bytes that get streamed even when the file is replaced in between. A body of 64 KiB or less, range included, is read with one `handle.read()` and returned as a `Uint8Array`. Anything larger is `handle.createReadStream({ start, end })`. Either way the body owns the handle and closes it, and async disposal closes it when `body()` was never called.

`lookup` resolves `null` for `ENOENT`, `ENOTDIR`, anything that is not a regular file or directory, and paths that leave the root. The file is opened with `O_NONBLOCK` where the platform has it, so a FIFO in the tree cannot hang a request.

A miss costs one `open` call. A hit costs `open`, then `realpath` and `fstat` run concurrently, then one `lstat`. A link loop or a name too long for the filesystem answers like a miss.

### Containment

By default the real path of the target, symlinks and Windows junctions resolved, must stay inside the real path of `root`. A link pointing inside the root is served, one pointing outside answers 404, as does a directory link pointing outside. The check runs after `open` succeeds and before anything is served, so it adds no cost to misses. The real path of `root` is resolved once and cached, and resolved again when a path is rejected, see [`ContainedRoot`](./paths.md#containedroot).

`open` follows links before the check runs, so the checked real path must also name the entry the handle opened, compared by device and inode with `lstat`. A link swapped in between the two calls by someone who can write inside the root answers 404 instead of serving its target.

`followSymlinks: true` skips both checks. `lookup` still refuses a path that leaves the root lexically, such as `../package.json`, so `..` cannot escape the root either way, even when `lookup` is called directly.

## bytesSource

```ts
bytesSource(
  read: (path: string) => Promise<Uint8Array | null>,
  options?: { etag?: "content" | false }
): ServoSource
```

Adapts a byte store, such as an in-memory map or a database, to a source. `read` resolves `null` for a missing path. The store has no directories: `/docs/` is served from the `docs/index.html` key when it exists, and `/docs` is never redirected.

With `etag: "content"`, the bytes are hashed with SHA-1 into a strong ETag. That enables 304 revalidation for stores without a modification time. The hash is cached per `Uint8Array`, so a store that keeps its arrays in memory and returns the same one on every read hashes it once. A store that reads a fresh copy on every lookup, such as one backed by `fs.readFile`, still reads and hashes the whole file on every request, 304s included. Prefer `FileSystemSource` or a custom source with a cheap ETag for those. The default is `false`.

```ts
import { bytesSource, servo } from "@openally/servo";

const files = new Map([["hello.txt", new TextEncoder().encode("hello")]]);

const handler = servo(
  bytesSource(async(path) => files.get(path) ?? null, { etag: "content" }),
  { index: false, extensions: [] }
);
```

## bytesEntry

```ts
bytesEntry(
  bytes: Uint8Array,
  options?: { etag?: string; mtime?: Date }
): ServoEntry
```

Wraps bytes already in memory as an entry, for `send()` or a custom source. Ranges are views over the same memory and disposal does nothing. `etag` is used as the ETag as is. Pass [`contentEtag(bytes)`](./utilities.md#contentetag) to hash one from the bytes.

```ts
import { bytesEntry, send } from "@openally/servo";

await send(req, res, {
  entry: bytesEntry(content.bytes, { etag: `"${content.hash}"` }),
  contentType: "application/octet-stream",
  maxAge: 31536000,
  immutable: true,
  private: true
});
```

## Writing a source

A source only has to implement `lookup`. This one serves blobs from an object store and streams them:

```ts
import type { ServoSource } from "@openally/servo";

const bucketSource: ServoSource = {
  async lookup(path) {
    const head = await bucket.head(path);
    if (head === null) {
      return null;
    }

    return {
      size: head.size,
      mtime: head.lastModified,
      etag: head.etag,
      body: (range) => bucket.stream(path, range),
      async [Symbol.asyncDispose]() {}
    };
  }
};
```

`lookup` runs for every candidate `servo()` tries: precompressed siblings, the index and each extension. Keep it cheap for misses.
