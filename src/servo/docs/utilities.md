# Utilities

Pure helpers used by `servo()`, exported for handlers that do their own routing. None of them touch the response. Only `containedPath` touches the filesystem.

## Path safety

### decodeRequestPath

```ts
decodeRequestPath(target: string): string | null
```

Cuts a raw request target at the first `?` or `#` and decodes it once with `decodeURIComponent`. Returns `null` on malformed encoding such as `%E0%A4%A`.

It does not use the WHATWG `URL` parser, which resolves `..` and `%2e%2e` before the caller can see them.

```ts
decodeRequestPath("/a%20b/..%2fc?x=1"); // "/a b/../c"
decodeRequestPath("/%E0%A4%A");         // null
```

### safePath

```ts
safePath(input: string): SafePath

type SafePath =
  | { ok: true; path: string; directory: boolean }
  | { ok: false; reason: PathRejection };

type PathRejection = "invalid" | "absolute" | "traversal" | "reserved";
```

Validates a decoded path relative to the root. On success, `path` has no leading or trailing slash (`""` is the root) and `directory` is `true` for an empty input or a trailing slash.

| Order | Check | Reason | `servo()` status |
| --- | --- | --- | --- |
| 1 | U+0000 to U+001F or U+007F | `invalid` | 400 |
| 2 | Leading `/` or drive letter, after `\` becomes `/` | `absolute` | 403 |
| 3 | Normalized path is `..` or starts with `../` | `traversal` | 403 |
| 4 | A segment contains `:`, ends with `.` or a space, or is a Windows device name (`CON`, `PRN`, `AUX`, `NUL`, `COM1`-`COM9`, `LPT1`-`LPT9`, any case, any extension) | `reserved` | 403 |

Inner traversal that stays inside the root is collapsed: `a/../b` becomes `b`.

```ts
safePath("docs/");           // { ok: true, path: "docs", directory: true }
safePath("a/../b");          // { ok: true, path: "b", directory: false }
safePath("..\\secret");      // { ok: false, reason: "traversal" }
safePath("con.txt");         // { ok: false, reason: "reserved" }
```

### normalizePosix

```ts
normalizePosix(relative: string): string
```

Collapses `.`, `..` and empty segments without touching the filesystem. Leading `..` that cannot collapse are kept, and a trailing slash is preserved. An empty result is `"."` (or `"./"`).

### isDotfilePath

```ts
isDotfilePath(path: string): boolean
```

Whether any segment starts with a dot. A leading `.well-known` segment is exempt, but a dotfile below it is not.

### containedPath

```ts
containedPath(root: string, relative: string): Promise<string | null>
```

Resolves `relative` under `root` and returns its real path, or `null` when that real path leaves the real path of `root`. A missing leaf is resolved through its closest existing parent, so a path that does not exist yet can still be checked.

## HTTP

### contentType

```ts
contentType(path: string, table?: Readonly<Record<string, string>>): string
```

Longest-suffix match on the lowercased basename. Textual types (`text/*`, `+json`, `+xml`, JSON, XML, JavaScript) get `; charset=utf-8` unless the table entry already has parameters. Unknown names get `application/octet-stream`.

`DEFAULT_CONTENT_TYPES` covers html, htm, css, js, mjs, cjs, json, map, webmanifest, wasm, txt, md, xml, csv, svg, png, jpg, jpeg, gif, webp, avif, bmp, ico, woff, woff2, ttf, otf, mp3, ogg, wav, mp4, webm, glb, gltf, pdf and zip. Keys carry their dot, and multi-part suffixes work:

```ts
contentType("app.js"); // "text/javascript; charset=utf-8"

const table = { ...DEFAULT_CONTENT_TYPES, ".tar.gz": "application/gzip" };
contentType("a.tar.gz", table); // "application/gzip"
```

### parseRange

```ts
parseRange(header: string, size: number): ByteRange | "unsatisfiable" | null

interface ByteRange { start: number; end: number } // inclusive
```

| Header, size 1000 | Result |
| --- | --- |
| `bytes=0-0` | `{ start: 0, end: 0 }` |
| `bytes=500-` | `{ start: 500, end: 999 }` |
| `bytes=-500` | `{ start: 500, end: 999 }` |
| `bytes=900-5000` | `{ start: 900, end: 999 }` |
| `bytes=10-5`, `bytes=1000-`, `bytes=-0` | `"unsatisfiable"` |
| `bytes=0-1,4-5`, `items=0-1`, `bytes=x` | `null`: ignore the header and send 200 |

### isFresh

```ts
isFresh(req: IncomingMessage, validators: { etag?: string; mtime?: Date }): boolean
```

Whether a 304 can be sent. `If-None-Match` wins when present: it matches `*` or any tag of its list, `W/` prefixes ignored. Otherwise `If-Modified-Since` matches when `mtime`, truncated to seconds, is not newer than its date.

### cacheControl

```ts
cacheControl(options: { dev?: boolean; maxAge?: number; immutable?: boolean }): string | null
```

| Options | Value |
| --- | --- |
| `{ dev: true }` | `no-cache` |
| `{ maxAge: 3600 }` | `public, max-age=3600` |
| `{ maxAge: 31536000, immutable: true }` | `public, max-age=31536000, immutable` |
| `{ maxAge: 0 }` | `public, max-age=0, must-revalidate` |
| `{}` | `null`, no header |
