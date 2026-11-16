# HTTP utilities

Pure helpers used by `send()` and `servo()` to build headers and read request headers, exported for handlers that do their own routing. None of them touch the response or the filesystem. Path helpers live in [Path utilities](./paths.md).

## contentType

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

A table is compiled into a map on first use and cached by identity. Build custom tables once, outside the request handler, and do not mutate them after use.

## negotiateEncoding

```ts
negotiateEncoding<T extends string>(header: string | undefined, codings: readonly T[]): T | null
```

Picks the coding of `codings` that `Accept-Encoding` prefers: highest q-value first, then the order of `codings` on a tie. An explicit entry beats `*`, and `q=0` refuses a coding. Returns `null` when none is accepted, meaning the identity encoding should be sent.

```ts
negotiateEncoding("gzip, br", ["br", "gzip"]);        // "br"
negotiateEncoding("gzip, br;q=0.5", ["br", "gzip"]);  // "gzip"
negotiateEncoding("*;q=0, gzip", ["br", "gzip"]);     // "gzip"
negotiateEncoding(undefined, ["br", "gzip"]);         // null
```

## acceptsEncoding

```ts
acceptsEncoding(header: string | undefined, coding: string): boolean
```

Whether `Accept-Encoding` accepts `coding` with a q-value above 0, an explicit entry taking precedence over `*`.

## parseRange

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

## isFresh

```ts
isFresh(req: IncomingMessage, validators: { etag?: string; mtime?: Date }): boolean
```

Whether a 304 can be sent. `If-None-Match` wins when present: it matches `*` or any tag of its list, `W/` prefixes ignored. Otherwise `If-Modified-Since` matches when `mtime`, truncated to seconds, is not newer than its date.

## cacheControl

```ts
cacheControl(options: { dev?: boolean; maxAge?: number; immutable?: boolean; private?: boolean }): string | null
```

| Options | Value |
| --- | --- |
| `{ dev: true }` | `no-cache` |
| `{ maxAge: 3600 }` | `public, max-age=3600` |
| `{ maxAge: 31536000, immutable: true }` | `public, max-age=31536000, immutable` |
| `{ maxAge: 31536000, immutable: true, private: true }` | `private, max-age=31536000, immutable` |
| `{ maxAge: 0 }` | `public, max-age=0, must-revalidate` |
| `{ maxAge: Infinity }` | `public, max-age=2147483648` |
| `{}` | `null`, no header |

`maxAge` is floored and clamped to `[0, 2147483648]`, the largest value caches must accept (RFC 9111). `NaN` throws a `TypeError`, and `servo()` checks it when called rather than on each request.

## contentEtag

```ts
contentEtag(bytes: Uint8Array): string
```

A strong ETag hashed from `bytes`, cached by the identity of the array: hashing the same `Uint8Array` again returns the cached tag. Do not mutate the bytes after the first call. Pass it to [`bytesEntry`](./sources.md#bytesentry) for content that has no modification time.
