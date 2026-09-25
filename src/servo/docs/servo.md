# servo

The static file middleware.

```ts
servo(
  root: string | ServoSource,
  options?: ServoOptions
): ServoHandler

type ServoHandler = (req: IncomingMessage, res: ServerResponse, next?: () => void) => void;
```

`root` is a folder path or a [`ServoSource`](./sources.md). `servo("./dist")` is shorthand for `servo(new FileSystemSource("./dist"))`; pass the source yourself to set its options, such as `followSymlinks`.

The handler never throws and never leaves a rejected promise behind.

## Usage

```ts
import http from "node:http";
import { servo } from "@openally/servo";

const serve = servo("./public", {
  prefix: "/static",
  maxAge: 86400,
  precompressed: { brotli: true, gzip: true }
});

http.createServer((req, res) => {
  serve(req, res, () => {
    res.statusCode = 404;
    res.end("not found");
  });
}).listen(8080);
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `prefix` | `"/"` | URL prefix the folder is mounted under. `/assets` and `/assets/` are equivalent. Compared on the raw URL, before decoding. |
| `methodNotAllowed` | `"next"` | Methods other than GET and HEAD go to `next()`. `"reject"` answers 405 with `Allow: GET, HEAD`, and so does `"next"` when no `next` was given. |
| `dev` | `false` | Sends `Cache-Control: no-cache` and ignores `maxAge`. |
| `etag` | `true` | Sends an ETag: the entry's own, else `W/"<size hex>-<mtime ms hex>"`. |
| `lastModified` | `true` | Sends `Last-Modified` when the entry has an mtime. |
| `maxAge` | | `Cache-Control: public, max-age=N`. No header when unset. `0` adds `must-revalidate`. |
| `immutable` | `false` | Appends `immutable` to the `maxAge` header. |
| `index` | `"index.html"` | File served for a directory, possibly nested (`"docs/index.html"`). `false` disables it. |
| `extensions` | `["html", "htm"]` | Tried in order when the exact path misses, so `/about` finds `about.html`. |
| `redirect` | `true` | A directory requested without a trailing slash answers 302 to the slashed URL, query string kept. |
| `single` | `false` | SPA fallback. `true` serves `index` (or `index.html` when `index` is `false`), a string names another file. |
| `dotfiles` | `"ignore"` | `"ignore"` answers 404, `"deny"` answers 403, `"allow"` serves them. `.well-known` at the root is always allowed. |
| `ignore` | | `(path) => boolean`. Matching paths answer 404. Receives normalized paths without a leading slash. |
| `precompressed` | `{}` | `{ brotli?: boolean; gzip?: boolean }`. See [precompressed files](#precompressed-files). |
| `contentTypes` | | Suffix-to-MIME entries merged over [the defaults](./utilities.md#contenttype), e.g. `{ ".ts": "text/plain" }`. |
| `rejectionStatus` | | Overrides the status of a [path rejection](./utilities.md#safepath), e.g. `{ traversal: 404 }`. |
| `setHeaders` | | `(res, path, entry) => void`, runs after default headers. `Content-Length` and `Content-Range` are set later. |
| `onNoMatch` | | `(req, res) => void`, called when nothing matches, instead of `next()`. |
| `onError` | | `(error, req, res) => void`, called on an I/O error before the headers are written, instead of an empty 500. |

## Request pipeline

1. A request outside `prefix` goes to `next()` (404 without `next`) without touching the source.
2. A method other than GET or HEAD follows `methodNotAllowed`.
3. The path is decoded and validated by [`decodeRequestPath` and `safePath`](./utilities.md#path-safety). A rejection answers 400 or 403.
4. A dotfile answers 404 (403 with `dotfiles: "deny"`), and so does a path matched by `ignore`.
5. The path is resolved against the source, as described below.
6. The entry goes through [`send()`](./send.md#send), which answers 200, 206, 304 or 416.

## Resolution

For a validated path `p`:

1. `p` ends with a slash (or is the root): try `p/<index>`.
2. Otherwise try `p`. When `p` is a directory, answer 302 to `<prefix><p>/` with `redirect`, or try `p/<index>` without it.
3. Try `p.<ext>` for each entry of `extensions`, in order.
4. With `single`, when the last segment has no extension, serve the fallback file with status 200.
5. Call `onNoMatch`, else `next()`, else answer 404.

`index`, `extensions` and `single` are validated when `servo()` is called, and a value that could leave the directory or change more than the last segment throws a `TypeError`. Every candidate is still checked against `dotfiles` and `ignore`, so an index or fallback file cannot reach a hidden path. The bare prefix (`/editors/scene` with prefix `/editors/scene`) is the root directory, so it gets the step 2 redirect.

## Precompressed files

With `precompressed.brotli`, a client whose `Accept-Encoding` lists `br` with a q-value above 0 gets `<file>.br` when it exists. `gzip` works the same with `.gz`, tried after brotli. The response carries `Content-Encoding` and the Content-Type of the original name. The sibling's own size and mtime make its ETag, and byte ranges apply to the compressed bytes.

`Vary: Accept-Encoding` is sent on every file response once either option is on, including the ones served uncompressed.

## compose

```ts
compose(...handlers: ServoHandler[]): ServoHandler
```

Chains handlers: each one's `next` runs the following handler. After the last one, the outer `next` is called, or 404 is sent when there is none.

```ts
import { compose, servo } from "@openally/servo";

const editors = compose(...Array.from(packages, (editor) => servo(editor.dist, {
  prefix: `/editors/${editor.name}`,
  dev: true
})));
```

A request under `/editors/` that matches no mounted editor falls through to the outer `next`. Add a final handler to keep answering 404 for those:

```ts
compose(
  ...mounts,
  (req, res, next) => req.url?.startsWith("/editors/") ? res.writeHead(404).end() : next?.()
);
```
