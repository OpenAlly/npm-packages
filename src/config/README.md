<p align="center"><h1 align="center">
  Config
</h1>

<p align="center">
  Reactive configuration loader with safe hot reload configuration upon <a href="https://json-schema.org/" target="_blank">JSON Schema</a>
</p>

## Requirements
- [Node.js](https://nodejs.org/en/) v20 or higher

## Getting Started

This package is available in the Node Package Repository and can be easily installed with [npm](https://docs.npmjs.com/getting-started/what-is-npm) or [yarn](https://yarnpkg.com).

```bash
$ npm i @openally/config
# or
$ yarn add @openally/config
```

## Features

- Hot-reloading of configuration
- Reactive with observable key(s)
- Safe with [JSON Schema](https://json-schema.org/) validation
- Support [TOML](https://github.com/toml-lang/toml) as input (enable the parser when the file extension end with **.toml**)
- Read configuration with no extension that start with a dot (like `.nodesecurerc` for example).


## Usage example

Create a simple json file for your project

```json
{
  "loglevel": 5,
  "logsize": 4048,
  "login": "administrator"
}
```

Now, create a new Configuration instance and read it

```js
import { AsynchronousConfig } from "@openally/config";

const config = new AsynchronousConfig("./path/to/config.json");
await config.read();
console.log(cfg.get("loglevel")); // stdout: 5

// Observe (with an Observable Like) the update made to login property
config.observableOf("login").subscribe(console.log);
config.set("login", "admin");

// Payload getter will return a deepClone with all configuration properties
console.log(config.payload);

config.close();
```

> [!IMPORTANT]
> `config.json` should exists otherwise it will throw an Error. Look at `createOnNoEntry` option for more information !

## Events
Configuration class is extended by a [Node.js EventEmitter](https://nodejs.org/api/events.html). The class can trigger several events:

| event name | description |
| --- | --- |
| `configWritten` | The configuration payload has been written on the local disk |
| `watcherInitialized` | The file watcher has been initialized (it will hot reload the configuration on modification) |
| `reload` | The configuration has been hot reloaded successfully |
| `close` | Event triggered when the configuration is asked to be closed |

## API

### `AsynchronousConfig`

```ts
const config = new AsynchronousConfig(path: string, options?: ConfigOptions);
```

Available options are:

| name | type | default value | description |
| --- | --- | --- | --- |
| `createOnNoEntry` | `boolean` | `false` | Create the file with default payload value if he doesn't exist on the local disk |
| `writeOnSet` | `boolean` | `false` | Write the file on the disk after each time `.set()` is called |
| `autoReload` | `boolean` | `false` | Setup hot reload of the configuration file |
| `jsonSchema` | `object` | `null` | The default JSON Schema for the configuration |
| `fs` | `FileSystem` | `fs` | The file system to use for reading and writing the configuration |

> [!NOTE]
> When no schema is provided, it will search for a file prefixed by `.schema` with the same config name.

### `AsynchronousConfig.read(defaultPayload?: object): Promise<AsynchronousConfig>`

Will read the local configuration on disk. A default `payload` value can be provided in case the file doesn't exist !

> [!CAUTION]
> When the file doesn't exist, the configuration is written at the next loop iteration

### `AsynchronousConfig.setupHotReload(): void`

Setup the hot reload of the configuration file. It will watch the file for modification and reload the configuration when it happens.

This method is automatically triggered if the Configuration has been created with the option `autoReload` set to true.

### `AsynchronousConfig.get<T>(fieldPath: string, depth?: number): T`

Get a value from a key (fieldPath). For example, let take a json payload with a root `foo` field.

```js
const config = new AsynchronousConfig("./path/to/file.json");
await config.read();
const fooValue = config.get("foo");
```

If the retrieved value is a JavaScript object, you can limit the depth with `depth` option.

### `AsynchronousConfig.set(fieldPath: string, fieldValue: string)`

Set or udpate a given field in the configuration. The file will be written on the disk if the option `writeOnSet` is set to true.

```js
const config = new AsynchronousConfig("./config.json", {
  createOnNoEntry: true
});

await config.read();
config.set("foo", "hello world!");
```

### `AsynchronousConfig.observableOf(fieldPath: string): Observable<T>`

Return an Observable that will emit the value of the given fieldPath when it changes.

```ts
const config = new AsynchronousConfig("./config.json");
await config.read({ foo: "bar" });

// Observe initial and next value(s) of foo
config.observableOf("foo").subscribe(console.log);
config.set("foo", "baz");
```

### `AsynchronousConfig.close(): Promise<void>`

Close the configuration. It will stop the file watcher, remove subscribers and emit the `close` event.

### `AsynchronousConfig.payload: object`

Return a deep clone of the configuration payload.

### `AsynchronousConfig.writeOnDisk(): Promise<void>`

Write the configuration payload on the local disk.

## License
MIT
