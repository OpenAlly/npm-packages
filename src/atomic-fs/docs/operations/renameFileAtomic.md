# renameFileAtomic

Moves a file. Can refuse to clobber the destination, and falls back to a copy when the two paths are on different devices.

```ts
renameFileAtomic(
  from: string,
  to: string,
  options?: RenameFileAtomicOptions
): Promise<boolean>
```

Resolves `true` when the file moved, and `false` only when `overwrite` is `false` and the destination already existed.

## Usage

```ts
import { renameFileAtomic } from "@openally/atomic-fs";

await renameFileAtomic("./draft.png", "./assets/sprite.png", { mkdir: true });
```

With `overwrite: false`, an occupied destination is left in place:

```ts
const moved = await renameFileAtomic("./draft.png", "./assets/sprite.png", {
  overwrite: false
});

if (!moved) {
  console.log("sprite.png is taken");
}
```

Both paths are resolved through `realpath` first, so moving a symbolic link moves the file it points at.

## Options

Every [shared option](./writeFileAtomic.md#shared-options) applies, plus:

| Option | Default | Description |
| --- | --- | --- |
| `overwrite` | `true` | `false` declines an occupied destination and leaves both paths untouched. |
| `fsync` | `true` | Flushes the copy made for a cross-device move. Ignored on a same-device move, which copies nothing. |

## overwrite: true

A plain `rename`, which is already atomic on a single device. The function adds the retry policy, the cross-device fallback below, and a lock shared with the write operations, so a rename cannot land in the middle of a [`writeFileAtomic`](./writeFileAtomic.md) on the same path.

## overwrite: false

The destination is claimed with a hard link, which fails with `EEXIST` when the destination exists. The source is unlinked once the link holds. Concurrent calls aiming at one destination resolve `true` exactly once:

```ts
const results = await Promise.all(
  drafts.map((draft) => renameFileAtomic(draft, "./assets/sprite.png", {
    overwrite: false
  }))
);

results.filter(Boolean).length; // exactly 1
```

## Crossing a device boundary

`rename` and `link` both reject with `EXDEV` when the source and the destination live on different filesystems. The fallback copies the file to a temporary sibling of the destination, flushes it when `fsync` is on, moves it into place and unlinks the source. The temporary file is cleaned up if any of that fails.

With `overwrite: false` the temporary copy is hard-linked onto the destination instead of renamed, the same `EEXIST` claim as a same-device move, so the destination is either absent or complete. The copy happens before the claim and is discarded when the destination is taken.

## See also

- [`writeFileAtomic`](./writeFileAtomic.md) for the shared options in full.
- [`AtomicFile`](../AtomicFile.md) to bind `overwrite` and the rest once.
