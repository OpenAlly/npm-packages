# Response writers

Functions that write one response. `servo()` is built on `send()`, and the payload helpers cover handlers that answer with a computed value instead of a file.

## send

```ts
send(
  req: IncomingMessage,
  res: ServerResponse,
  options: SendOptions
): Promise<void>
```

Writes a [`ServoEntry`](./sources.md#servoentry) as the response.

```ts
import { FileSystemSource, send } from "@openally/servo";

const source = new FileSystemSource("./exports");

async function download(req, res, name) {
  const entry = await source.lookup(name);
  if (entry === null || entry === "directory") {
    res.writeHead(404).end();

    return;
  }

  res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
  await send(req, res, { entry, path: name, maxAge: 60 });
}
```

| Option | Default | Description |
| --- | --- | --- |
| `entry` | | The `ServoEntry` to send. Required. |
| `path` | `""` | Name used for the Content-Type lookup and passed to `setHeaders`. |
| `contentType` | | Explicit Content-Type, skipping the lookup on `path`. |
| `contentTypes` | | Suffix-to-MIME entries merged over [the defaults](./utilities.md#contenttype) for the lookup. |
| `encoding` | | `Content-Encoding` of the entry bytes. |
| `vary` | `false` | Adds `Accept-Encoding` to `Vary`, keeping the fields already there. |
| `etag` | `true` | |
| `lastModified` | `true` | |
| `dev`, `maxAge`, `immutable` | | Build `Cache-Control`, see [`cacheControl`](./utilities.md#cachecontrol). |
| `setHeaders` | | `(res, path, entry) => void`, runs after default headers. `Content-Length` and `Content-Range` are set later. |

### Outcomes

| Status | When | Body |
| --- | --- | --- |
| 304 | `If-None-Match` matches the ETag, or `If-Modified-Since` covers the mtime | none. `Content-Type` and `Content-Length` are dropped, validators and `Cache-Control` kept. |
| 416 | GET with a range starting past the end, `bytes=-0`, or start > end | none, `Content-Range: bytes */<size>` |
| 206 | GET with one satisfiable range, and `If-Range` absent or matching | the range, `Content-Range: bytes a-b/<size>` |
| 200 | everything else. HEAD gets the headers only. | the entry |

The conditional checks read the `ETag` and `Last-Modified` headers after `setHeaders` has run, so a validator set by hand is the one compared.

### Headers

Headers already set on `res` are kept. The exceptions are `Content-Length`, `Content-Range` and `Content-Encoding`, which always describe the bytes being sent. `Vary` is extended rather than replaced.

`Accept-Ranges: bytes` and `X-Content-Type-Options: nosniff` are always set.

### Errors and resources

`send()` awaits `entry[Symbol.asyncDispose]()` once when it is done, whether `body()` was called or not. By then any stream returned by `body()` has ended or been destroyed. When `body()` rejects, `send()` restores the headers `res` had before the call and rejects, so the caller can answer the error on the response it handed over.

Once the body is streaming, a stream error or a client abort destroys the response. `stream.pipeline` destroys the body stream too, which closes a `FileSystemSource` handle.

## allowMethods

```ts
allowMethods(
  req: IncomingMessage,
  res: ServerResponse,
  methods?: string[]
): boolean
```

Returns `true` when `req.method` is in `methods` (default `["GET", "HEAD"]`). Otherwise answers 405 with `Allow: <methods>` and returns `false`.

## sendPayload

```ts
sendPayload(
  req: IncomingMessage,
  res: ServerResponse,
  options: SendPayloadOptions
): Promise<void>
```

Sends an in-memory string or `Uint8Array` through [`send()`](#send), so HEAD, byte ranges, `nosniff` and conditional requests behave as for a file. Headers already set on `res` are kept, except `Cache-Control` when the option is given.

| Option | Default | Description |
| --- | --- | --- |
| `body` | | `string` (sent as UTF-8) or `Uint8Array`. Required. |
| `contentType` | `"application/octet-stream"` | |
| `cacheControl` | | Sent as is, replacing any `Cache-Control` already set. |
| `etag` | `false` | Adds a strong SHA-1 ETag and answers 304 when `If-None-Match` matches it. |

## sendJson

```ts
sendJson(
  req: IncomingMessage,
  res: ServerResponse,
  options: SendJsonOptions
): Promise<void>
```

`sendPayload` with `JSON.stringify(options.body)` and `application/json; charset=utf-8`. Takes the same options, and `contentType` can still override the type.

```ts
import { allowMethods, sendJson } from "@openally/servo";

if (allowMethods(req, res)) {
  sendJson(req, res, { body: projection.snapshot(), etag: true });
}
```
