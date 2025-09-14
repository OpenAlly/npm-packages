# SynchronousConfig

```ts
const config = new SynchronousConfig(path: string, options?: SynchronousConfigOptions);
```

Available options are:

| name | type | default value | description |
| --- | --- | --- | --- |
| `createOnNoEntry` | `boolean` | `false` | Create the file with default payload value if it doesn't exist on the local disk |
| `writeOnSet` | `boolean` | `false` | Write the file on the disk after each time `.set()` is called |
| `autoReload` | `boolean` | `false` | (Unused in sync version, for API compatibility) |
| `jsonSchema` | `object` | `null` | The default JSON Schema for the configuration |
| `fs` | `FileSystem` | `fs` | The file system to use for reading and writing the configuration |

> [!NOTE]
> When no schema is provided, it will search for a file suffixed by `.schema.json` with the same config name.

## Events
Configuration class is extended by a [Node.js EventEmitter](https://nodejs.org/api/events.html). The class can trigger the following event:

| event name | description |
| --- | --- |
| `close` | Event triggered when the configuration is asked to be closed |

## API

### `SynchronousConfig.read(defaultPayload?: object): SynchronousConfig`

Reads the local configuration on disk. A default `payload` value can be provided in case the file doesn't exist.

> [!CAUTION]
> When the file doesn't exist, the configuration is written at the next loop iteration.

### `SynchronousConfig.get<T>(fieldPath: string, depth?: number): T | null`

Get a value from a key (fieldPath). For example, let’s take a json payload with a root `foo` field.

```js
const config = new SynchronousConfig("./path/to/file.json");
config.read();
const fooValue = config.get("foo");
```

If the retrieved value is a JavaScript object, you can limit the depth with the `depth` option.

### `SynchronousConfig.set(fieldPath: string, fieldValue: any): SynchronousConfig`

Set or update a given field in the configuration. The file will be written on the disk if the option `writeOnSet` is set to true.

```js
const config = new SynchronousConfig("./config.json", {
  createOnNoEntry: true
});

config.read();
config.set("foo", "hello world!");
```

### `SynchronousConfig.observableOf(fieldPath: string, depth?: number): Observable<T>`

Return an Observable that will emit the value of the given fieldPath when it changes.

```ts
const config = new SynchronousConfig("./config.json");
config.read({ foo: "bar" });

// Observe initial and next value(s) of foo
config.observableOf("foo").subscribe(console.log);
config.set("foo", "baz");
```

### `SynchronousConfig.close(): void`

Close the configuration. It will remove subscribers, write the configuration to disk, and emit the `close` event.

### `SynchronousConfig.payload: object`

Return a deep clone of the configuration payload.

### `SynchronousConfig.writeOnDisk(): void`

Write the configuration payload on the local disk.
