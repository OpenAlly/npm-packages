# Path utilities

Helpers that turn a raw request target into a path that is safe to look up, used by `servo()` before any source sees the request. They are exported for handlers that do their own routing.

| Helper | Touches the filesystem | `@openally/servo/paths` |
| --- | --- | --- |
| [`splitTarget`](#splittarget) | no | yes |
| [`decodeRequestPath`](#decoderequestpath) | no | yes |
| [`safePath`](#safepath) | no | yes |
| [`normalizePosix`](#normalizeposix) | no | yes |
| [`isDotfilePath`](#isdotfilepath) | no | yes |
| [`containedPath`](#containedpath) | yes | no |
| [`ContainedRoot`](#containedroot) | yes | no |

The `@openally/servo/paths` entry imports no `node:` module, so browser bundles can use it. It also exports the `SafePath` and `PathRejection` types:

```ts
import { safePath } from "@openally/servo/paths";
```

`containedPath` and `ContainedRoot` read the filesystem, so only the root entry exports them.

## Request targets

### splitTarget

```ts
splitTarget(target: string): RequestTarget // { path: string; search: string }
```

Cuts a raw request target at the first `?` or `#`, without decoding anything. `search` keeps its `?` and drops any fragment. It is a cheap replacement for `URL.parse(req.url, base).pathname` when a handler only compares the path, but unlike `URL` it does not collapse `..` or `%2e%2e`, so compare it against exact values or run it through `decodeRequestPath` and `safePath`.

```ts
splitTarget("/catalog.json?v=2#top"); // { path: "/catalog.json", search: "?v=2" }

if (splitTarget(req.url ?? "/").path !== "/catalog.json") {
  return next();
}
```

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

## Validation

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
| 4 | A segment contains `:`, ends with `.` or a space, is a Windows device name (`CON`, `PRN`, `AUX`, `NUL`, `CONIN$`, `CONOUT$`, `COM0`-`COM9`, `LPT0`-`LPT9`, any case, any extension), or looks like an 8.3 short name (`GIT~1`, `PROGRA~1.TXT`) | `reserved` | 403 |

Inner traversal that stays inside the root is collapsed: `a/../b` becomes `b`.

Short names are rejected because NTFS volumes that generate them open `GIT~1` as `.git` and `ENV~1` as `.env`, which would get past any check made on the request path, `dotfiles` and `ignore` included. A file legitimately named like `backup~1.txt` cannot be served either.

```ts
safePath("docs/");           // { ok: true, path: "docs", directory: true }
safePath("a/../b");          // { ok: true, path: "b", directory: false }
safePath("..\\secret");      // { ok: false, reason: "traversal" }
safePath("con.txt");         // { ok: false, reason: "reserved" }
safePath("GIT~1/config");    // { ok: false, reason: "reserved" }
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

## Containment

### containedPath

```ts
containedPath(root: string, relative: string): Promise<string | null>
```

Resolves `relative` under `root` and returns its real path, or `null` when that real path leaves the real path of `root`. A missing leaf is resolved through its closest existing parent, so a path that does not exist yet can still be checked.

Each call resolves the real path of `root` again, as it is `new ContainedRoot(root).resolve(relative)`. Use `ContainedRoot` to check many paths against the same root.

### ContainedRoot

```ts
new ContainedRoot(root: string)

containedRoot.root: string;                                  // path.resolve(root)
containedRoot.resolve(relative: string): Promise<string | null>;
```

`containedPath` bound to one root. The real path of `root` is resolved on the first call and reused, and a failed resolution is retried on the next one. When `resolve` rejects a path, the real path of `root` is resolved again and the check retried once, so a root that is a link retargeted by an atomic deploy (`current -> releases/42`) keeps working. `resolve` has the same contract as `containedPath(root, relative)`. `FileSystemSource` uses it internally.

```ts
import { ContainedRoot } from "@openally/servo";

const workspace = new ContainedRoot("./assets");

const real = await workspace.resolve("textures/stone.png");
if (real === null) {
  throw new Error("escapes the workspace");
}
```
