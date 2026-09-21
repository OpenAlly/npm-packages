# writeFileAtomic

Replaces a file in one step. The data goes to a temporary sibling, is flushed to the storage device, then renamed over the destination. A reader either sees the old file or the new one.

```ts
writeFileAtomic(
  target: string,
  data: AtomicData,
  options?: WriteFileAtomicOptions
): Promise<void>
```

## Usage

```ts
import { writeFileAtomic } from "@openally/atomic-fs";

await writeFileAtomic("./project.json", JSON.stringify(project, null, 2));
```

`data` is a string or any `ArrayBufferView`:

```ts
export type AtomicData = string | ArrayBufferView;
```

Views are written by their `byteLength`, so a `Float64Array` of two elements produces 16 bytes, and a `subarray` writes only the window it covers.

## Steps

1. The target is resolved through `realpath`, so a write to a symbolic link lands on the file it points at and leaves the link in place.
2. The parent directory is created when [`mkdir`](#shared-options) is on.
3. The temporary name comes from the [naming strategy](../naming.md), always as a sibling of the target, so the closing rename never crosses a device.
4. `mode` and `chown` are read off the existing target when they were not given.
5. The temporary file is opened, [`tmpfileCreated`](#write-options) is awaited, the data is written and flushed.
6. `chown` and `chmod` are applied to the temporary file.
7. The temporary file is renamed onto the target, under the [retry policy](#shared-options).

The temporary file is removed before the call returns, whether it resolves or rejects.

## Shared options

Accepted by every operation in the package.

| Option | Default | Description |
| --- | --- | --- |
| `mkdir` | `false` | Creates the destination parent tree. Off by default, so a missing parent rejects with `ENOENT` the way `fs.writeFile` does. |
| `naming` | `defaultTemporaryNaming` | A [`TemporaryNaming`](../naming.md) used to build the temporary path, or the [options](../naming.md#temporarynaming) to build one from. |
| `retry` | enabled on `win32` | Retries `EPERM`, `EBUSY` and `EACCES`. `false` disables it. |
| `signal` | | An `AbortSignal`, checked between filesystem steps and honoured during the write itself. |
| `cleanupOnExit` | `true` | Unlinks the temporary file if the process exits mid-operation. |

```ts
export interface RetryOptions {
  /** Total number of tries, including the first one. @default 5 */
  attempts?: number;
  /** Milliseconds to wait before the second try. @default 10 */
  delay?: number;
  /** Multiplier applied to delay after each failed try. @default 2 */
  factor?: number;
}
```

Windows raises `EPERM` or `EBUSY` when an antivirus or another open handle holds the destination at the moment of the rename, so the retry is on by default there and off everywhere else. Pass an explicit policy to retry for longer:

```ts
await writeFileAtomic(target, data, {
  retry: { attempts: 20, delay: 5, factor: 1 }
});
```

An abort rejects with an `AbortError` and removes the temporary file.

### cleanupOnExit

In-flight temporary files are tracked, and a single `process.on("exit")` handler unlinks those still tracked at exit. That covers an uncaught exception and an explicit `process.exit`. After a `SIGKILL` or a power loss the temporary file stays on disk, where [`match()`](../naming.md#match) recognizes it.

## Write options

| Option | Default | Description |
| --- | --- | --- |
| `encoding` | `"utf8"` | Used when `data` is a string. |
| `mode` | inherited, else `0o666` | Permissions of the file. |
| `chown` | inherited | `{ uid, gid }`, or `false` to never change ownership. |
| `fsync` | `true` | Flushes the file before the rename. |
| `fsyncDirectory` | `false` | Flushes the parent directory after the rename. Ignored on `win32`. |
| `tmpfileCreated` | | Awaited once the temporary file exists, before anything is written. |

### mode and chown

Each is read from the existing target when not given, so rewriting a file preserves its permissions and owner:

```ts
await fs.chmod("./config.json", 0o600);
await writeFileAtomic("./config.json", next);

// still 0o600
```

An explicit value wins over the inherited one. `chown` and `chmod` failures are ignored on `ENOSYS`, and on `EPERM` or `EINVAL` in a non-root process; anything else is thrown. On Windows `process.getuid` does not exist, so ownership is never inherited.

### fsync and fsyncDirectory

`fsync` flushes the file's contents. `fsyncDirectory` also flushes the parent directory, so the rename itself survives a power loss. It costs a second flush and is off by default:

```ts
await writeFileAtomic("./ledger.bin", record, { fsyncDirectory: true });
```

Windows has no equivalent call, so the option is ignored there.

### tmpfileCreated

Runs after the temporary file is opened and before the first byte is written. It is awaited, so an async hook delays the write, and anything it throws aborts the operation and removes the temporary file.

```ts
await writeFileAtomic(target, data, {
  tmpfileCreated: (tmpfile) => index.register(tmpfile)
});
```

## Concurrency

Calls to the same path queue behind each other, so the last one wins with its full contents. The queue is keyed on the path as given and on what it resolves to through `realpath`, so a symbolic link and the file it points at share one queue. Calls to different paths run in parallel.

```ts
await Promise.all([
  writeFileAtomic("./a.json", first),
  writeFileAtomic("./a.json", second),
  writeFileAtomic("./b.json", third)
]);
```

The lock is per process. Two processes writing the same path get what `rename` alone gives: the file stays whole, but which write survives is not controlled.

## See also

- [`writeFileIfAbsent`](./writeFileIfAbsent.md) writes only when the path is free.
- [`AtomicFile`](../AtomicFile.md) binds these options once instead of repeating them.
