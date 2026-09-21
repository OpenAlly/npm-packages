# writeFileIfAbsent

Writes a file only when nothing occupies the path. Meant for scaffolding a default without overwriting an existing file.

```ts
writeFileIfAbsent(
  target: string,
  data: AtomicData,
  options?: WriteFileAtomicOptions
): Promise<boolean>
```

Resolves `true` when it created the file, `false` when the path was already taken.

## Usage

```ts
import { writeFileIfAbsent } from "@openally/atomic-fs";

const created = await writeFileIfAbsent("./project.json", template, {
  mkdir: true
});

if (!created) {
  console.log("a project already lives here");
}
```

## How the claim works

The data is written to a temporary sibling opened with the `wx` flag, then hard-linked onto the target. `link` checks and creates in one filesystem operation and fails with `EEXIST` when the target exists, so concurrent calls resolve `true` exactly once:

```ts
const results = await Promise.all(
  writers.map((data) => writeFileIfAbsent("./lock", data))
);

results.filter(Boolean).length; // exactly 1
```

The temporary file is removed either way. A link failure other than `EEXIST` is thrown.

The target must be on a filesystem that supports hard links. NTFS and the usual Unix filesystems do; FAT32 and exFAT reject with `EPERM`.

## Options

The same options as [`writeFileAtomic`](./writeFileAtomic.md#shared-options). `mode` and `chown` are applied to the temporary file, which the link carries over to the target. The file is created fresh, so nothing is inherited when they are left out.

## See also

- [`writeFileAtomic`](./writeFileAtomic.md) replaces the target whether or not it exists.
- [`renameFileAtomic`](./renameFileAtomic.md) with `overwrite: false` makes the same kind of claim for a file that already exists elsewhere.
