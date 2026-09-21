<p align="center"><h1 align="center">
  Atomic FS
</h1>

<p align="center">
  Crash-safe atomic file write and rename primitives with a pluggable temporary naming strategy
</p>

<p align="center">
  <a href="https://github.com/OpenAlly/npm-packages/src/atomic-fs">
    <img src="https://img.shields.io/github/package-json/v/OpenAlly/npm-packages/main/src/atomic-fs?style=for-the-badge&label=version" alt="npm version">
  </a>
  <a href="https://github.com/OpenAlly/npm-packages/tree/main/src/LICENSE">
    <img src="https://img.shields.io/github/license/OpenAlly/npm-packages?style=for-the-badge" alt="license">
  </a>
  <a href="https://github.com/OpenAlly/npm-packages/tree/main/src/atomic-fs">
    <img src="https://img.shields.io/npm/dw/@openally/atomic-fs?style=for-the-badge" alt="download">
  </a>
  <a href="https://github.com/OpenAlly/npm-packages/tree/main/src/atomic-fs">
    <img src="https://img.shields.io/github/actions/workflow/status/OpenAlly/npm-packages/atomic-fs.yml?style=for-the-badge">
  </a>
</p>

## Requirements
- [Node.js](https://nodejs.org/en/) v24 or higher

## Getting Started

This package is available in the Node Package Repository and can be easily installed with [npm](https://docs.npmjs.com/getting-started/what-is-npm) or [yarn](https://yarnpkg.com).

```bash
$ npm i @openally/atomic-fs
# or
$ yarn add @openally/atomic-fs
```

## Usage example

`writeFileAtomic` writes to a sibling temporary file, flushes it to disk, then renames it over the destination. Readers see the old file or the new one, even after a crash.

```ts
import { writeFileAtomic } from "@openally/atomic-fs";

await writeFileAtomic(
  "./project.json",
  JSON.stringify(project, null, 2)
);
```

`writeFileIfAbsent` writes only when the path is free, and resolves `false` otherwise:

```ts
import { writeFileIfAbsent } from "@openally/atomic-fs";

const created = await writeFileIfAbsent("./project.json", template);
if (!created) {
  console.log("a project already lives here");
}
```

`renameFileAtomic` moves a file, falling back to a copy when the two paths sit on different devices:

```ts
import { renameFileAtomic } from "@openally/atomic-fs";

await renameFileAtomic(
  "./draft.png",
  "./assets/sprite.png",
  { mkdir: true }
);
```

With `overwrite: false` it resolves `false` when the destination exists:

```ts
const moved = await renameFileAtomic("./draft.png", "./assets/sprite.png", {
  overwrite: false
});
```

### Recognizing temporary files

A directory listed while a write is in flight contains its temporary file. `isTemporary` recognizes the names the instance generates:

```ts
import { AtomicFile } from "@openally/atomic-fs";

const atomic = new AtomicFile({ mkdir: true });

await atomic.write("./assets/sprite.png", bytes);

for (const entry of await readdir("./assets")) {
  if (atomic.isTemporary(entry)) {
    continue;
  }

  console.log(entry);
}
```

`isTemporary` is bound to the instance, so it can be passed to a directory walker on its own. It follows the `naming` option:

```ts
import { AtomicFile } from "@openally/atomic-fs";

const atomic = new AtomicFile({
  naming: {
    prefix: "~",
    suffix: ".partial"
  }
});
```

`naming` also takes a built [`TemporaryNaming`](./docs/naming.md), for a strategy shared across many writes or a shape other than `<prefix><basename>.<hex><suffix>`.

The match requires the full generated shape, `.<name>.<hex>.tmp` by default, so a file named `.notes.tmp` does not match.

## API

- [`writeFileAtomic`](./docs/operations/writeFileAtomic.md) replaces a file in one step. Documents the options the other operations share.
- [`writeFileIfAbsent`](./docs/operations/writeFileIfAbsent.md) writes a file only when the path is free.
- [`renameFileAtomic`](./docs/operations/renameFileAtomic.md) moves a file, optionally refusing to clobber the destination.
- [`AtomicFile`](./docs/AtomicFile.md) binds one set of options to all three, and exposes `isTemporary`.
- [`naming`](./docs/naming.md) generates temporary names and recognizes the ones it generated.

## Guarantees

What "atomic" covers in this package:

- **The rename**: `rename(2)` on one device is already atomic, and `overwrite: true` is that call. The package adds the temporary file and its flush, the cross-device fallback, the retry policy and a per-path lock.
- **Concurrent writes**: Serialized per path inside one process. Across processes only `rename` applies: the file stays whole, but which write survives is not controlled.
- **Exit cleanup**: Runs on `process.on("exit")`, so it covers a thrown exception or `process.exit`. `SIGKILL` and power loss leave the temporary file on disk, where `isTemporary` identifies it.
- **Windows**: An antivirus or open handle on the destination makes the rename fail with `EPERM` or `EBUSY`. The default retry covers a brief hold, but under sustained contention the attempts run out.
- **`overwrite: false`**: Claims the destination with a hard link, which fails with `EEXIST` when the destination exists. Across devices the file is first copied to a temporary sibling of the destination and that copy is hard-linked into place, so the destination is never visible half-written. The copy is discarded when the destination is taken.

## License
MIT
