# Naming

Temporary file names, generated and recognized by one object.

## `TemporaryNaming`

```ts
export interface TemporaryNaming {
  /** Builds an absolute temporary path sibling to `target`. */
  create(target: string): string;
  /** Whether `basename` is a temporary artifact produced by `create`. */
  match(basename: string): boolean;
}
```

A directory listed while writes are in flight contains temporary files. `match` recognizes the names `create` produces, so a listing can filter them out.

## `defaultTemporaryNaming`

The strategy used when none is given. It produces `.<name>.<12 hex chars>.tmp` next to the target:

```ts
import { defaultTemporaryNaming } from "@openally/atomic-fs";

defaultTemporaryNaming.create("/assets/sprite.png");
// "/assets/.sprite.png.4f2a91c0be83.tmp"

defaultTemporaryNaming.match(".sprite.png.4f2a91c0be83.tmp"); // true
defaultTemporaryNaming.match("sprite.png");                   // false
```

## `temporaryNaming`

```ts
temporaryNaming(options?: TemporaryNamingOptions): TemporaryNaming
```

| Option | Default | Description |
| --- | --- | --- |
| `prefix` | `"."` | Prepended to the target basename. |
| `suffix` | `".tmp"` | Appended after the random token. |
| `entropy` | `6` | Number of random bytes in the token, rendered as hexadecimal. |
| `random` | `randomBytes(entropy)` | Token factory, mostly useful to make tests deterministic. Must return `entropy * 2` lowercase hexadecimal characters, which is what `match` recognizes; `create` throws otherwise. |

```ts
import { temporaryNaming } from "@openally/atomic-fs";

const naming = temporaryNaming({
  prefix: "~",
  suffix: ".partial"
});

naming.create("/assets/sprite.png");
// "/assets/~sprite.png.4f2a91c0be83.partial"
```

A strategy with both an empty `prefix` and an empty `suffix` throws, because its `match` would have nothing to anchor on.

### `create`

Resolves `target` to an absolute path and returns a sibling of it. The closing rename is only atomic when the temporary file and the destination share a directory, and therefore a device.

The token comes from `randomBytes`, so names do not collide across calls, threads or processes.

### `match`

The pattern requires the full generated shape, token included. With the defaults it is `^\..+\.[0-9a-f]{12}\.tmp$`, so a file named `.notes.tmp` or `build.tmp` does not match:

```ts
naming.match(".notes.tmp");  // false
naming.match(".tmp");        // false
```

Two strategies with different prefixes or suffixes do not recognize each other's artifacts, so one process can filter its own temporary files without hiding another's.

## Choosing a strategy per call

Every operation, and the `AtomicFile` constructor, take `naming` as either a built `TemporaryNaming` or the `TemporaryNamingOptions` to build one from:

```ts
import {
  temporaryNaming,
  writeFileAtomic
} from "@openally/atomic-fs";

await writeFileAtomic("/assets/sprite.png", bytes, {
  naming: {
    prefix: "~",
    suffix: ".partial"
  }
});

const naming = temporaryNaming({
  prefix: "~",
  suffix: ".partial"
});

await writeFileAtomic(
  "/assets/sprite.png", bytes, { naming }
);
```

Options are resolved on every call, so build a strategy reused across many writes once with `temporaryNaming`. `match` is only reachable from the built object. Options cover one shape, `<prefix><basename>.<hex><suffix>`. For anything else, such as a temporary name that drops the target basename to stay under `NAME_MAX`, implement `TemporaryNaming`.

`naming` replaces, it never merges. An `AtomicFile` built with `{ naming: { suffix: ".partial" } }` and a call passing `{ naming: { prefix: "~" } }` writes `~sprite.png.<hex>.tmp`, not `~sprite.png.<hex>.partial`.

## Filtering a directory listing

```ts
import { readdir } from "node:fs/promises";
import { AtomicFile } from "@openally/atomic-fs";

const atomic = new AtomicFile({
  mkdir: true
});

async function listAssets(directory: string) {
  const entries = await readdir(directory);

  return entries.filter(
    (entry) => !atomic.isTemporary(entry)
  );
}
```

[`AtomicFile#isTemporary`](./AtomicFile.md#istemporary) is bound to the instance, so it can be passed to a directory walker on its own.

The same filter finds temporary files that outlived their writer. `cleanupOnExit` removes them on an orderly exit, but a `SIGKILL` or a power loss leaves them on disk.
