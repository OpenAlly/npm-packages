# Sources

A source maps a validated path to an entry. `servo()` and `send()` never read files themselves, so anything that can produce bytes can be served.

```ts
interface ServoSource {
  lookup(path: string): Promise<Lookup>;
}

type Lookup = ServoEntry | "directory" | null;
```

`path` has already been through [`safePath`](./utilities.md#safepath): no leading or trailing slash, no `..`, and `""` for the root. `lookup` resolves `null` when nothing is there, and `"directory"` for a folder, which lets `servo()` redirect it or look for its index.

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

Each lookup opens the file with `fs.promises.open` and reads its size and mtime from `handle.stat()`, so the headers describe the bytes that get streamed even when the file is replaced in between. The body is `handle.createReadStream({ start, end })`, and async disposal closes the handle when the stream has not taken ownership.

`lookup` resolves `null` for `ENOENT`, `ENOTDIR`, anything that is not a regular file or directory, and paths that leave the root. The file is opened with `O_NONBLOCK` where the platform has it, so a FIFO in the tree cannot hang a request.

### Containment

By default the real path of the target, symlinks and Windows junctions resolved, must stay inside the real path of `root`. A link pointing inside the root is served, one pointing outside answers 404. Missing leaves are resolved through their closest existing parent.

`followSymlinks: true` skips that check. The request path is still validated, so `..` cannot escape the root either way.

## bytesSource

```ts
bytesSource(
  read: (path: string) => Promise<Uint8Array | null>,
  options?: { etag?: "content" | false }
): ServoSource
```

Adapts a byte store, such as an in-memory map or a database, to a source. `read` resolves `null` for a missing path. The store has no directories: `/docs/` is served from the `docs/index.html` key when it exists, and `/docs` is never redirected.

With `etag: "content"`, each lookup hashes the bytes with SHA-1 into a strong ETag. That enables 304 revalidation for stores without a modification time, at the cost of reading and hashing the whole file on every request. The default is `false`.

```ts
import { bytesSource, servo } from "@openally/servo";

const files = new Map([["hello.txt", new TextEncoder().encode("hello")]]);

const handler = servo(
  bytesSource(async(path) => files.get(path) ?? null, { etag: "content" }),
  { index: false, extensions: [] }
);
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
