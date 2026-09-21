# AtomicFile

Binds one set of options to the three operations. It also holds the [naming strategy](./naming.md) they use, so it can tell whether a directory entry is one of its temporary files.

```ts
new AtomicFile(options?: AtomicFileOptions)
```

```ts
export type AtomicFileOptions = WriteFileAtomicOptions & RenameFileAtomicOptions;
```

Every option of [`writeFileAtomic`](./operations/writeFileAtomic.md) and [`renameFileAtomic`](./operations/renameFileAtomic.md) is accepted, and applies to each call unless that call overrides it. The options are copied at construction, so mutating the object afterwards changes nothing.

## Usage

```ts
import { AtomicFile } from "@openally/atomic-fs";

const atomic = new AtomicFile({ mkdir: true });

await atomic.write("./assets/sprite.png", bytes);
await atomic.rename("./draft.png", "./assets/sprite.png");
```

A per-call option wins over the bound one:

```ts
const atomic = new AtomicFile({ mkdir: true });

await atomic.write("./assets/sprite.png", bytes, { mkdir: false });
// rejects with ENOENT when ./assets does not exist
```

## Properties

| Property | Type | Description |
| --- | --- | --- |
| `naming` | `TemporaryNaming` | The resolved strategy, built from what the constructor was given, or `defaultTemporaryNaming`. |

## Methods

### `write()`

```ts
write(
  target: string,
  data: AtomicData,
  options?: WriteFileAtomicOptions
): Promise<void>
```

[`writeFileAtomic`](./operations/writeFileAtomic.md) with the bound options.

### `writeIfAbsent()`

```ts
writeIfAbsent(
  target: string,
  data: AtomicData,
  options?: WriteFileAtomicOptions
): Promise<boolean>
```

[`writeFileIfAbsent`](./operations/writeFileIfAbsent.md) with the bound options.

### `rename()`

```ts
rename(
  from: string,
  to: string,
  options?: RenameFileAtomicOptions
): Promise<boolean>
```

[`renameFileAtomic`](./operations/renameFileAtomic.md) with the bound options, including `overwrite`:

```ts
const atomic = new AtomicFile({ overwrite: false });

await atomic.rename("./draft.png", "./assets/sprite.png"); // false when taken
```

### `isTemporary()`

```ts
isTemporary(basename: string): boolean
```

Calls `naming.match`, the strategy the writes use, so it follows a custom `naming`:

```ts
import { AtomicFile } from "@openally/atomic-fs";

const atomic = new AtomicFile({
  naming: { prefix: "~", suffix: ".partial" }
});

// writes now produce ~sprite.png.<hex>.partial
atomic.isTemporary("~sprite.png.4f2a91c0be83.partial"); // true
```

The constructor resolves the option once, so `naming` is always a full [`TemporaryNaming`](./naming.md) whichever form was given.

The method is bound to the instance, so it can be destructured:

```ts
const { isTemporary } = atomic;

for await (const entry of walk(root, { isTemporary })) {
  console.log(entry);
}
```
