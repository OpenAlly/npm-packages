<p align="center"><h1 align="center">
  Servo
</h1>

<p align="center">
  Zero-dependency static file and payload serving for Node.js
</p>

<p align="center">
  <a href="https://github.com/OpenAlly/npm-packages/src/servo">
    <img src="https://img.shields.io/github/package-json/v/OpenAlly/npm-packages/main/src/servo?style=for-the-badge&label=version" alt="npm version">
  </a>
  <a href="https://github.com/OpenAlly/npm-packages/tree/main/src/LICENSE">
    <img src="https://img.shields.io/github/license/OpenAlly/npm-packages?style=for-the-badge" alt="license">
  </a>
  <a href="https://github.com/OpenAlly/npm-packages/tree/main/src/servo">
    <img src="https://img.shields.io/npm/dw/@openally/servo?style=for-the-badge" alt="download">
  </a>
  <a href="https://github.com/OpenAlly/npm-packages/tree/main/src/servo">
    <img src="https://img.shields.io/github/actions/workflow/status/OpenAlly/npm-packages/servo.yml?style=for-the-badge">
  </a>
</p>

## Requirements
- [Node.js](https://nodejs.org/en/) v24 or higher

## Getting Started

Install with [npm](https://docs.npmjs.com/getting-started/what-is-npm) or [yarn](https://yarnpkg.com):

```bash
$ npm i @openally/servo
# or
$ yarn add @openally/servo
```

## Usage example

`servo()` returns a Connect-style `(req, res, next?)` handler. It plugs into `http.createServer` directly:

```ts
import http from "node:http";
import { servo } from "@openally/servo";

http
  .createServer(servo("./dist", { maxAge: 3600 }))
  .listen(8080);
```

The same handler works in Vite, Polka or Express. Requests outside the `prefix`, and methods other than GET and HEAD, go to `next()`:

```ts
import { compose, servo } from "@openally/servo";

server.middlewares.use(compose(
  servo("./editors/scene/dist", { prefix: "/editors/scene", dev: true }),
  servo("./editors/sprite/dist", { prefix: "/editors/sprite", dev: true })
));
```

`/editors/scene` answers 302 to `/editors/scene/`, which serves `index.html`.

Files do not have to live in a folder. `bytesSource` serves any async byte store, here with a content-hash ETag so reloads get 304s:

```ts
import { bytesSource, servo } from "@openally/servo";

const handler = servo(
  bytesSource((path) => store.read(path), { etag: "content" }),
  { prefix: "/assets", methodNotAllowed: "reject", index: false }
);
```

A single computed payload needs no source at all:

```ts
import { allowMethods, sendJson } from "@openally/servo";

function catalogHandler(req, res, next) {
  if (URL.parse(req.url ?? "", "http://localhost")?.pathname !== "/catalog.json") {
    return next();
  }
  if (allowMethods(req, res)) {
    sendJson(req, res, { body: catalog.snapshot(), etag: true });
  }
}
```

## API

- [`servo()` and `compose()`](./docs/servo.md): the middleware, its options and the resolution order.
- [`send()`, `sendPayload()`, `sendJson()` and `allowMethods()`](./docs/send.md): response writers for an entry or an in-memory payload.
- [`FileSystemSource` and `bytesSource()`](./docs/sources.md): where entries come from, and how to write your own source.
- [Utilities](./docs/utilities.md): `safePath`, `decodeRequestPath`, `containedPath`, `contentType`, `parseRange`, `isFresh` and the other pure helpers. The path helpers are also exported from the browser-safe `@openally/servo/paths` entry.

## Path safety

The raw `req.url` is decoded once with `decodeURIComponent` and never goes through the WHATWG `URL` parser, which would silently collapse `..` and `%2e%2e`. The decoded path is then checked in order:

| Check | Example | Status |
| --- | --- | --- |
| Malformed percent-encoding | `/%E0%A4%A` | 400 |
| Control characters, `%00` included | `/a/%00.txt` | 400 |
| Absolute path or drive letter, after `\` becomes `/` | `//etc/passwd`, `/C:/win.ini` | 403 |
| Escapes the root once normalized | `/..%2fpackage.json` | 403 |
| `:`, trailing `.` or space, Windows device name | `/file.txt::$DATA`, `/con.txt`, `/index.html.` | 403 |
| Dotfile segment, `.well-known` excepted | `/.git/config` | 404 (`dotfiles: "deny"`: 403) |
| `ignore(path)` returns true | | 404 |
| Real path leaves the real root (symlinks, junctions) | `/escape/secret.txt` | 404 |

The Windows rules apply on every platform, so a path rejected on Windows is also rejected on Linux. The downside: a file legitimately named `a:b.txt` on Linux cannot be served. `rejectionStatus` changes the first five statuses.

## HTTP behavior

- GET and HEAD, with `ETag` and `Last-Modified` revalidation. `If-None-Match` takes a list, `*`, and compares weakly.
- Single byte ranges: `bytes=a-b`, `bytes=a-` and `bytes=-n`. Several ranges in one header are ignored, and the full file is sent with 200. A range that starts past the end answers 416.
- `If-Range` needs a strong ETag or the exact `Last-Modified` date. The default ETags are weak, so for filesystem files it falls back to a full 200.
- Precompressed `.br` and `.gz` siblings, chosen from `Accept-Encoding` q-values.
- `X-Content-Type-Options: nosniff` on every file, and `charset=utf-8` on every textual type.

Directory listings, on-the-fly compression, multipart ranges and write methods are out of scope.

## License
MIT
